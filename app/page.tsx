
"use client";

import { useEffect, useState } from "react";
import {
    DndContext,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    type DragEndEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";


type Task = {
    id: number;
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    day: number;
    done: boolean;
    status: "todo" | "in_progress" | "done";
};


type Project = {
    id: number;
    name: string;
    description: string;
    color: string;
    tasks: Task[];
};

type PlannedTask = {
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    day: number;
};

type ProjectPlan = {
    projectName: string;
    projectDescription: string;
    estimatedDays: number;
    tasks: PlannedTask[];
};


export default function Home() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [dbError, setDbError] = useState("");
    const [newProject, setNewProject] = useState("");
    const [notice, setNotice] = useState("");
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [isSavingProject, setIsSavingProject] = useState(false);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
    const [editProjectName, setEditProjectName] = useState("");
    const [editProjectDescription, setEditProjectDescription] = useState("");
    const [aiGoal, setAiGoal] = useState("");
    const [aiPlan, setAiPlan] = useState<ProjectPlan | null>(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [aiError, setAiError] = useState("");
    const [isSavingPlan, setIsSavingPlan] = useState(false);
    const [savePlanError, setSavePlanError] = useState("");
    const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
    const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [editingTaskProjectId, setEditingTaskProjectId] = useState<number | null>(null);

    const [editTaskTitle, setEditTaskTitle] = useState("");
    const [editTaskDescription, setEditTaskDescription] = useState("");
    const [editTaskPriority, setEditTaskPriority] = useState<
        "low" | "medium" | "high"
    >("medium");
    const [editTaskDay, setEditTaskDay] = useState("1");
    const [isSavingTaskEdit, setIsSavingTaskEdit] = useState(false);

    const router = useRouter();
    const [authChecked, setAuthChecked] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    async function handleKanbanDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over) return;

        const [projectIdText, taskIdText] = String(active.id).split(":");
        const projectId = Number(projectIdText);
        const taskId = Number(taskIdText);
        const newStatus = String(over.id) as Task["status"];

        if (
            !Number.isInteger(projectId) ||
            !Number.isInteger(taskId) ||
            !["todo", "in_progress", "done"].includes(newStatus)
        ) {
            return;
        }

        const project = projects.find((item) => item.id === projectId);
        const task = project?.tasks.find((item) => item.id === taskId);

        if (!task || task.status === newStatus) return;

        await moveTaskStatus(projectId, taskId, newStatus);
    }


    useEffect(() => {
        const supabase = createClient();
        let active = true;

        async function loadDashboard() {
            setProjectsLoading(true);
            setDbError("");

            try {
                // 1. Periksa sesi pengguna.
                const { data: claimsData, error: claimsError } =
                    await supabase.auth.getClaims();

                if (!active) return;

                const userId = claimsData?.claims?.sub;

                if (claimsError || !userId) {
                    router.replace("/login");
                    return;
                }

                // 2. Ambil proyek.
                const { data: projectRows, error: projectsError } =
                    await supabase
                        .from("projects")
                        .select("id, name, description, color")
                        .order("created_at", { ascending: false });

                if (!active) return;

                if (projectsError) {
                    throw new Error(
                        `Gagal memuat proyek: ${projectsError.message}`
                    );
                }

                // 3. Ambil tugas.
                const { data: taskRows, error: tasksError } =
                    await supabase
                        .from("tasks")
                        .select(
                            "id, project_id, title, description, priority, day, is_completed, status"
                        );

                if (!active) return;

                if (tasksError) {
                    throw new Error(
                        `Gagal memuat tugas: ${tasksError.message}`
                    );
                }

                // 4. Gabungkan proyek dan tugas.
                const loadedProjects = (projectRows ?? []).map((project) => ({
                    id: Number(project.id),
                    name: project.name,
                    description: project.description,
                    color:
                        project.color === "emerald"
                            ? "bg-emerald-500"
                            : project.color === "sky"
                                ? "bg-sky-500"
                                : "bg-violet-500",
                    tasks: (taskRows ?? [])
                        .filter(
                            (task) => Number(task.project_id) === Number(project.id)
                        )
                        .map((task) => ({
                            id: Number(task.id),
                            title: task.title,
                            description: task.description ?? "",
                            priority:
                                task.priority === "low" || task.priority === "high"
                                    ? task.priority
                                    : "medium",
                            day: Number(task.day ?? 1),
                            done: task.is_completed,
                            status: task.status,
                        })),
                }));

                if (!active) return;

                setProjects(loadedProjects);
            } catch (error) {
                if (!active) return;

                console.error("Gagal memuat dashboard:", error);

                setDbError(
                    error instanceof Error
                        ? error.message
                        : "Terjadi kesalahan saat memuat dashboard."
                );
            } finally {
                if (active) {
                    setProjectsLoading(false);
                    setAuthChecked(true);
                }
            }
        }

        loadDashboard();

        return () => {
            active = false;
        };
    }, [router]);

    useEffect(() => {
        if (!authChecked) return;

        let active = true;

        async function loadProjects() {
            setProjectsLoading(true);
            setDbError("");


            try {
                const supabase = createClient();

                // 1. Periksa sesi pengguna sebelum membaca database.
                const { data: claimsData, error: claimsError } =
                    await supabase.auth.getClaims();

                if (!active) return;

                const userId = claimsData?.claims?.sub;

                if (claimsError || !userId) {
                    router.replace("/login");
                    return;
                }

                // 2. Jika sesi valid, lanjutkan memuat proyek.
                const { data: projectsData, error: projectsError } =
                    await supabase
                        .from("projects")

                        .select("id, name, description, color")
                        .order("created_at", { ascending: false });

                if (projectsError) {
                    throw projectsError;
                }

                const { data: tasksData, error: tasksError } =
                    await supabase
                        .from("tasks")
                        .select(
                            "id, project_id, title, description, priority, day, is_completed, status"
                        );

                if (tasksError) {
                    throw tasksError;
                }

                const loadedProjects: Project[] = (projectsData ?? []).map(
                    (project) => ({
                        id: Number(project.id),
                        name: project.name,
                        description: project.description,
                        color: project.color,
                        tasks: (tasksData ?? [])
                            .filter(
                                (task) =>
                                    Number(task.project_id) === Number(project.id)
                            )
                            .map((task) => ({
                                id: Number(task.id),
                                title: task.title,
                                description: task.description ?? "",
                                priority:
                                    task.priority === "low" || task.priority === "high"
                                        ? task.priority
                                        : "medium",
                                day: Number(task.day ?? 1),
                                done: task.is_completed,
                                status: task.status,
                            })),
                    })
                );

                if (active) {
                    setProjects(loadedProjects);
                }
            } catch (error) {
                console.error("Gagal memuat proyek:", error);

                if (active) {
                    setDbError(
                        error instanceof Error
                            ? error.message
                            : "Gagal memuat data dari Supabase."
                    );
                }
            } finally {
                if (active) {
                    setProjectsLoading(false);
                }
            }
        }

        loadProjects();

        return () => {
            active = false;
        };
    }, [authChecked, router]);


    const allTasks = projects.flatMap((project) => project.tasks);
    const completed = allTasks.filter((task) => task.done).length;
    const progress = allTasks.length
        ? Math.round((completed / allTasks.length) * 100)
        : 0;

    async function toggleTask(projectId: number, taskId: number) {
        const supabase = createClient();

        // Pastikan pengguna memiliki sesi login yang valid.
        const { data: claimsData, error: claimsError } =
            await supabase.auth.getClaims();

        const userId = claimsData?.claims?.sub;

        if (claimsError || !userId) {
            setNotice("Sesi login tidak valid. Silakan login kembali.");
            return;
        }

        // Cari status tugas saat ini.
        const project = projects.find((item) => item.id === projectId);
        const task = project?.tasks.find((item) => item.id === taskId);

        if (!task) {
            setNotice("Tugas tidak ditemukan.");
            return;
        }

        const newStatus = !task.done;

        // Simpan perubahan ke Supabase.
        // RLS memeriksa apakah pengguna memiliki proyek induk tugas ini.
        const { data: updatedTask, error } = await supabase
            .from("tasks")
            .update({ is_completed: newStatus })
            .eq("id", taskId)
            .select("id, is_completed")
            .maybeSingle();

        if (error) {
            console.error("Gagal memperbarui tugas:", error);
            setNotice(`Gagal menyimpan status tugas: ${error.message}`);
            return;
        }

        if (!updatedTask) {
            setNotice(
                "Status tugas tidak berubah. Tugas mungkin tidak ditemukan atau akses ditolak oleh RLS."
            );
            return;
        }

        // Perbarui tampilan hanya setelah database berhasil.
        setProjects((current) =>
            current.map((item) =>
                item.id !== projectId
                    ? item
                    : {
                        ...item,
                        tasks: item.tasks.map((currentTask) =>
                            currentTask.id === taskId
                                ? {
                                    ...currentTask,
                                    done: updatedTask.is_completed,
                                }
                                : currentTask
                        ),
                    }
            )
        );

        setNotice("Status tugas berhasil disimpan.");
    }


    function startEditingTask(projectId: number, task: Task) {
        setEditingTaskProjectId(projectId);
        setEditingTaskId(task.id);
        setEditTaskTitle(task.title);
        setEditTaskDescription(task.description);
        setEditTaskPriority(task.priority);
        setEditTaskDay(String(task.day));
        setNotice("");
    }

    function cancelEditingTask() {
        setEditingTaskId(null);
        setEditingTaskProjectId(null);
        setEditTaskTitle("");
        setEditTaskDescription("");
        setEditTaskPriority("medium");
        setEditTaskDay("1");
    }

    async function saveTaskEdit(
        projectId: number,
        taskId: number
    ): Promise<boolean> {
        const title = editTaskTitle.trim();
        const description = editTaskDescription.trim();
        const day = Number(editTaskDay);

        if (!title) {
            setNotice("Judul tugas tidak boleh kosong.");
            return false;
        }

        if (
            !Number.isInteger(day) ||
            day < 1 ||
            day > 365
        ) {
            setNotice("Hari pengerjaan harus berupa angka 1–365.");
            return false;
        }

        if (isSavingTaskEdit) {
            return false;
        }

        setIsSavingTaskEdit(true);
        setNotice("");

        try {
            const supabase = createClient();

            const { data: updatedTask, error } = await supabase
                .from("tasks")
                .update({
                    title,
                    description,
                    priority: editTaskPriority,
                    day,
                })
                .eq("id", taskId)
                .eq("project_id", projectId)
                .select(
                    "id, project_id, title, description, priority, day, is_completed, status"
                )
                .maybeSingle();

            if (error) {
                setNotice(`Gagal menyimpan perubahan tugas: ${error.message}`);
                return false;
            }

            if (!updatedTask) {
                setNotice(
                    "Tugas tidak ditemukan atau tidak memiliki izin untuk diubah."
                );
                return false;
            }

            setProjects((current) =>
                current.map((project) =>
                    project.id !== projectId
                        ? project
                        : {
                            ...project,
                            tasks: project.tasks.map((task) =>
                                task.id !== taskId
                                    ? task
                                    : {
                                        ...task,
                                        title: updatedTask.title,
                                        description: updatedTask.description ?? "",
                                        priority: updatedTask.priority,
                                        day: Number(updatedTask.day),
                                        done: updatedTask.is_completed,
                                        status: updatedTask.status,
                                    }
                            ),
                        }
                )
            );

            cancelEditingTask();
            setNotice("Perubahan tugas berhasil disimpan.");
            return true;
        } catch {
            setNotice("Terjadi kesalahan saat menyimpan perubahan tugas.");
            return false;
        } finally {
            setIsSavingTaskEdit(false);
        }
    }

    async function moveTaskStatus(
        projectId: number,
        taskId: number,
        newStatus: Task["status"]
    ) {
        const supabase = createClient();

        const { data: updatedTask, error } = await supabase
            .from("tasks")
            .update({
                status: newStatus,
                is_completed: newStatus === "done",
            })
            .eq("id", taskId)
            .eq("project_id", projectId)
            .select("id, status, is_completed")
            .maybeSingle();

        if (error) {
            setNotice(`Gagal mengubah status tugas: ${error.message}`);
            return;
        }

        if (!updatedTask) {
            setNotice("Status tidak berubah. Periksa akses atau keberadaan tugas.");
            return;
        }

        setProjects((current) =>
            current.map((project) =>
                project.id !== projectId
                    ? project
                    : {
                        ...project,
                        tasks: project.tasks.map((task) =>
                            task.id !== taskId
                                ? task
                                : {
                                    ...task,
                                    status: updatedTask.status,
                                    done: updatedTask.is_completed,
                                }
                        ),
                    }
            )
        );

        setNotice("Status tugas berhasil diperbarui.");
    }


    async function generateProjectPlan(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const goal = aiGoal.trim();

        if (!goal || isGeneratingPlan) {
            return;
        }

        setIsGeneratingPlan(true);
        setAiError("");
        setAiPlan(null);

        try {
            const response = await fetch("/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: `Kamu adalah AI Project Assistant di ForgeOS.
Buat rencana proyek praktis berdasarkan tujuan berikut:
${goal}

Balas hanya dengan satu objek JSON valid. Jangan keluarkan teks,
catatan, penjelasan, atau tag <think> sebelum maupun sesudah JSON.
Karakter pertama respons harus { dan karakter terakhir harus }.
{
  "projectName": "nama singkat proyek",
  "projectDescription": "deskripsi proyek",
  "estimatedDays": 14,
  "tasks": [
    {
      "title": "judul tugas",
      "description": "deskripsi singkat tugas",
      "priority": "high",
      "day": 1
    }
  ]
}

Ketentuan:
- Buat 3 sampai 10 tugas yang konkret dan berurutan.
- priority hanya boleh low, medium, atau high.
- day adalah bilangan bulat mulai dari 1.
- estimatedDays harus berupa bilangan bulat positif.
- Gunakan bahasa Indonesia.`
                }),
            });

            const data = await response.json();


            if (!response.ok) {
                const errorMessage =
                    typeof data.error === "string"
                        ? data.error
                        : "Gagal membuat rencana proyek.";

                if (data.code === "AI_PROVIDER_BUSY") {
                    throw new Error(
                        "AI_PROVIDER_BUSY: " + errorMessage
                    );
                }

                throw new Error(errorMessage);
            }


            if (typeof data.result !== "string") {
                throw new Error("Respons AI tidak memiliki hasil teks yang valid.");
            }

            const jsonText = data.result
                .trim()
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/, "");

            const parsed: unknown = JSON.parse(jsonText);

            if (
                typeof parsed !== "object" ||
                parsed === null ||
                !("projectName" in parsed) ||
                typeof parsed.projectName !== "string" ||
                !("projectDescription" in parsed) ||
                typeof parsed.projectDescription !== "string" ||
                !("estimatedDays" in parsed) ||
                typeof parsed.estimatedDays !== "number" ||
                !("tasks" in parsed) ||
                !Array.isArray(parsed.tasks) ||
                parsed.tasks.length < 3 ||
                parsed.tasks.length > 10
            ) {
                throw new Error("Format rencana dari AI tidak valid. Silakan coba lagi.");
            }

            const validTasks = parsed.tasks.every(
                (task) =>
                    typeof task === "object" &&
                    task !== null &&
                    "title" in task &&
                    typeof task.title === "string" &&
                    "description" in task &&
                    typeof task.description === "string" &&
                    "priority" in task &&
                    ["low", "medium", "high"].includes(String(task.priority)) &&
                    "day" in task &&
                    typeof task.day === "number" &&
                    Number.isInteger(task.day) &&
                    task.day >= 1
            );

            if (
                !validTasks ||
                !Number.isInteger(parsed.estimatedDays) ||
                parsed.estimatedDays < 1
            ) {
                throw new Error("Data tugas dari AI tidak valid. Silakan coba lagi.");
            }

            setAiPlan(parsed as ProjectPlan);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan saat membuat rencana proyek.";

            setAiError(
                message.startsWith("AI_PROVIDER_BUSY: ")
                    ? message.replace("AI_PROVIDER_BUSY: ", "")
                    : message
            );
        } finally {
            setIsGeneratingPlan(false);
        }
    }


    async function saveAiPlan() {
        if (!aiPlan || isSavingPlan) return;

        setIsSavingPlan(true);
        setSavePlanError("");
        setDbError("");

        try {
            const supabase = createClient();

            const { data: claimsData, error: claimsError } =
                await supabase.auth.getClaims();

            const userId = claimsData?.claims?.sub;

            if (claimsError || !userId) {
                router.replace("/login");
                return;
            }

            const { data: projectData, error: projectError } =
                await supabase
                    .from("projects")
                    .insert({
                        name: aiPlan.projectName,
                        description: aiPlan.projectDescription,
                        color: "violet",
                        user_id: userId,
                    })
                    .select("id")
                    .single();

            if (projectError || !projectData) {
                throw new Error(
                    projectError?.message ?? "Proyek gagal disimpan."
                );
            }


            const taskRows = aiPlan.tasks.map((task) => ({
                project_id: projectData.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                day: task.day,
                is_completed: false,
                status: "todo",
            }));


            const { error: tasksError } = await supabase
                .from("tasks")
                .insert(taskRows);

            if (tasksError) {
                const { error: rollbackError } = await supabase
                    .from("projects")
                    .delete()
                    .eq("id", projectData.id)
                    .eq("user_id", userId);

                throw new Error(
                    rollbackError
                        ? `Tugas gagal disimpan: ${tasksError.message}. Proyek juga gagal dibersihkan: ${rollbackError.message}`
                        : `Tugas gagal disimpan: ${tasksError.message}`
                );
            }

            setAiPlan(null);
            setNotice("Proyek dan semua tugas AI berhasil disimpan.");

            // Perbarui daftar proyek yang sedang ditampilkan.
            const { data: projectsData, error: reloadError } =
                await supabase
                    .from("projects")
                    .select("id, name, description, color")
                    .order("created_at", { ascending: false });

            const { data: tasksData, error: reloadTasksError } =
                await supabase
                    .from("tasks")
                    .select(
                        "id, project_id, title, description, priority, day, is_completed, status"
                    );

            if (reloadError || reloadTasksError) {
                setDbError("Proyek tersimpan, tetapi daftar perlu dimuat ulang.");
                return;
            }

            setProjects(
                (projectsData ?? []).map((project) => ({
                    id: Number(project.id),
                    name: project.name,
                    description: project.description ?? "",
                    color: project.color ?? "violet",
                    tasks: (tasksData ?? [])
                        .filter(
                            (task) =>
                                Number(task.project_id) === Number(project.id)
                        )
                        .map((task) => ({
                            id: Number(task.id),
                            title: task.title,
                            description: task.description ?? "",
                            priority:
                                task.priority === "low" || task.priority === "high"
                                    ? task.priority
                                    : "medium",
                            day: Number(task.day ?? 1),
                            done: task.is_completed,
                            status: task.status,
                        })),
                }))
            );
        } catch (error) {
            setSavePlanError(
                error instanceof Error
                    ? error.message
                    : "Gagal menyimpan rencana AI."
            );
        } finally {
            setIsSavingPlan(false);
        }
    }

    async function addTask(projectId: number, title: string) {
        if (isSavingTask) return false;

        const taskTitle = title.trim();

        if (!taskTitle) {
            setNotice("Masukkan nama tugas terlebih dahulu.");
            return false;
        }

        setIsSavingTask(true);
        setNotice("");

        try {
            const supabase = createClient();

            const { data: claimsData, error: claimsError } =
                await supabase.auth.getClaims();

            const userId = claimsData?.claims?.sub;

            if (claimsError || !userId) {
                setNotice("Sesi login tidak valid. Silakan login kembali.");
                return false;
            }
            const { data: newTask, error } = await supabase
                .from("tasks")
                .insert({
                    project_id: projectId,
                    title: taskTitle,
                    description: "",
                    priority: "medium",
                    day: 1,
                    is_completed: false,
                    status: "todo",
                })
                .select(
                    "id, project_id, title, description, priority, day, is_completed, status"
                )
                .single();
            if (error) {
                console.error("Gagal menambahkan tugas:", error);
                setNotice(`Gagal menyimpan tugas: ${error.message}`);
                return false;
            }

            setProjects((current) =>
                current.map((project) =>
                    project.id !== projectId
                        ? project
                        : {
                            ...project,
                            tasks:
                                project.id === projectId && newTask
                                    ? [
                                        ...project.tasks,
                                        {
                                            id: Number(newTask.id),
                                            title: newTask.title,
                                            description: newTask.description ?? "",
                                            priority:
                                                newTask.priority === "low" ||
                                                    newTask.priority === "high"
                                                    ? newTask.priority
                                                    : "medium",
                                            day: Number(newTask.day ?? 1),
                                            done: newTask.is_completed,
                                            status: newTask.status,
                                        },
                                    ]
                                    : project.tasks,
                        }
                )
            );

            setNotice(`Tugas "${taskTitle}" berhasil disimpan.`);
            return true;
        } catch (error) {
            console.error("Terjadi kesalahan saat menyimpan tugas:", error);
            setNotice("Terjadi kesalahan saat menyimpan tugas. Silakan coba lagi.");
            return false;
        } finally {
            setIsSavingTask(false);
        }
    }

    async function deleteTask(projectId: number, taskId: number) {
        if (deletingTaskId !== null) return false;

        const project = projects.find((item) => item.id === projectId);
        const task = project?.tasks.find((item) => item.id === taskId);

        if (!project || !task) {
            setNotice("Tugas tidak ditemukan.");
            return false;
        }

        const confirmed = window.confirm(
            `Yakin ingin menghapus tugas "${task.title}"? Tindakan ini tidak dapat dibatalkan.`
        );

        if (!confirmed) return false;

        setDeletingTaskId(taskId);
        setNotice("");

        try {
            const supabase = createClient();

            const { data: claimsData, error: claimsError } =
                await supabase.auth.getClaims();

            const userId = claimsData?.claims?.sub;

            if (claimsError || !userId) {
                setNotice("Sesi login tidak valid. Silakan login kembali.");
                router.replace("/login");
                return false;
            }

            const { data: deletedTask, error } = await supabase
                .from("tasks")
                .delete()
                .eq("id", taskId)
                .eq("project_id", projectId)
                .select("id")
                .maybeSingle();

            if (error) {
                console.error("Gagal menghapus tugas:", error);
                setNotice(`Gagal menghapus tugas: ${error.message}`);
                return false;
            }

            if (!deletedTask) {
                setNotice(
                    "Tugas tidak ditemukan atau kamu tidak memiliki akses untuk menghapusnya."
                );
                return false;
            }

            setProjects((current) =>
                current.map((item) =>
                    item.id !== projectId
                        ? item
                        : {
                            ...item,
                            tasks: item.tasks.filter(
                                (currentTask) => currentTask.id !== taskId
                            ),
                        }
                )
            );

            setNotice(`Tugas "${task.title}" berhasil dihapus.`);
            return true;
        } catch (error) {
            console.error("Terjadi kesalahan saat menghapus tugas:", error);
            setNotice("Terjadi kesalahan saat menghapus tugas. Silakan coba lagi.");
            return false;
        } finally {
            setDeletingTaskId(null);
        }
    }



    async function addProject(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSavingProject) return;

        const name = newProject.trim();

        if (!name) {
            setNotice("Masukkan nama proyek terlebih dahulu.");
            return;
        }

        setIsSavingProject(true);
        setNotice("");

        try {
            const supabase = createClient();

            const { data: claimsData, error: claimsError } =
                await supabase.auth.getClaims();

            const userId = claimsData?.claims?.sub;

            if (claimsError || !userId) {
                setNotice("Sesi login tidak valid. Silakan login kembali.");
                return;
            }

            const { data: project, error } = await supabase
                .from("projects")
                .insert({
                    name,
                    description: "Proyek baru",
                    color: "emerald",
                    user_id: userId,
                })
                .select("id, name, description, color")
                .single();

            if (error) {
                console.error("Gagal menyimpan proyek:", error);
                setNotice(`Gagal menyimpan proyek: ${error.message}`);
                return;
            }

            setProjects((current) => [
                ...current,
                {
                    id: Number(project.id),
                    name: project.name,
                    description: project.description,
                    color: "bg-emerald-500",
                    tasks: [],
                },
            ]);

            setNewProject("");
            setNotice(`Proyek "${name}" berhasil disimpan.`);
        } catch (error) {
            console.error("Terjadi kesalahan saat menyimpan proyek:", error);
            setNotice("Terjadi kesalahan saat menyimpan proyek. Silakan coba lagi.");
        } finally {
            setIsSavingProject(false);
        }
    }


    async function updateProject(projectId: number) {
        if (isSavingProject) return false;

        const name = editProjectName.trim();
        const description = editProjectDescription.trim();

        if (!name) {
            setNotice("Nama proyek tidak boleh kosong.");
            return false;
        }

        setIsSavingProject(true);
        setNotice("");

        try {
            const supabase = createClient();

            const { data: claimsData, error: claimsError } =
                await supabase.auth.getClaims();

            const userId = claimsData?.claims?.sub;

            if (claimsError || !userId) {
                setNotice("Sesi login tidak valid. Silakan login kembali.");
                router.replace("/login");
                return false;
            }

            const { data: updatedProject, error } = await supabase
                .from("projects")
                .update({
                    name,
                    description,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", projectId)
                .eq("user_id", userId)
                .select("id, name, description")
                .maybeSingle();

            if (error) {
                console.error("Gagal memperbarui proyek:", error);
                setNotice(`Gagal memperbarui proyek: ${error.message}`);
                return false;
            }

            if (!updatedProject) {
                setNotice(
                    "Proyek tidak ditemukan atau kamu tidak memiliki akses untuk mengubahnya."
                );
                return false;
            }

            setProjects((current) =>
                current.map((project) =>
                    project.id === projectId
                        ? {
                            ...project,
                            name: updatedProject.name,
                            description: updatedProject.description,
                        }
                        : project
                )
            );

            setEditingProjectId(null);
            setEditProjectName("");
            setEditProjectDescription("");
            setNotice(`Proyek "${updatedProject.name}" berhasil diperbarui.`);

            return true;
        } catch (error) {
            console.error("Terjadi kesalahan saat memperbarui proyek:", error);
            setNotice("Terjadi kesalahan saat memperbarui proyek. Silakan coba lagi.");
            return false;
        } finally {
            setIsSavingProject(false);
        }
    }


    async function deleteProject(projectId: number) {
        if (deletingProjectId !== null) return false;

        const project = projects.find((item) => item.id === projectId);

        if (!project) {
            setNotice("Proyek tidak ditemukan.");
            return false;
        }

        const confirmed = window.confirm(
            `Yakin ingin menghapus proyek "${project.name}" beserta semua tugasnya? Tindakan ini tidak dapat dibatalkan.`
        );

        if (!confirmed) return false;

        setDeletingProjectId(projectId);
        setNotice("");

        try {
            const supabase = createClient();

            const { data: claimsData, error: claimsError } =
                await supabase.auth.getClaims();

            const userId = claimsData?.claims?.sub;

            if (claimsError || !userId) {
                setNotice("Sesi login tidak valid. Silakan login kembali.");
                router.replace("/login");
                return false;
            }

            const { data: deletedProject, error } = await supabase
                .from("projects")
                .delete()
                .eq("id", projectId)
                .eq("user_id", userId)
                .select("id")
                .maybeSingle();

            if (error) {
                console.error("Gagal menghapus proyek:", error);
                setNotice(`Gagal menghapus proyek: ${error.message}`);
                return false;
            }

            if (!deletedProject) {
                setNotice(
                    "Proyek tidak ditemukan atau kamu tidak memiliki akses untuk menghapusnya."
                );
                return false;
            }

            setProjects((current) =>
                current.filter((item) => item.id !== projectId)
            );

            setNotice(`Proyek "${project.name}" berhasil dihapus.`);

            return true;
        } catch (error) {
            console.error("Terjadi kesalahan saat menghapus proyek:", error);
            setNotice(
                "Terjadi kesalahan saat menghapus proyek. Silakan coba lagi."
            );
            return false;
        } finally {
            setDeletingProjectId(null);
        }
    }


    async function handleLogout() {
        const supabase = createClient();

        setNotice("");

        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Gagal logout:", error);
            setNotice(`Gagal logout: ${error.message}`);
            return;
        }

        router.replace("/login");
        router.refresh();
    }


    if (!authChecked || projectsLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div
                        className="h-10 w-10 animate-spin rounded-full border-4 border-violet-400/20 border-t-violet-400"
                        aria-hidden="true"
                    />
                    <div>
                        <p className="font-medium">Memuat ForgeOS</p>
                        <p className="mt-1 text-sm text-slate-400">
                            Menyiapkan proyek dan tugasmu...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (projectsLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
                Memuat proyek ForgeOS...
            </main>
        );
    }

    if (dbError) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-white">
                <h1 className="text-xl font-semibold">
                    Gagal memuat proyek
                </h1>
                <p className="max-w-xl text-center text-sm text-red-300">
                    {dbError}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-violet-600 px-4 py-2 hover:bg-violet-500"
                >
                    Coba lagi
                </button>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto flex min-h-screen max-w-[1500px]">
                <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-slate-900/70 p-6 md:flex md:flex-col">
                    <a href="#" className="flex items-center gap-3 text-xl font-bold">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl">
                            F
                        </span>
                        ForgeOS
                    </a>

                    <p className="mt-2 text-xs text-slate-500">
                        PERSONAL WORKSPACE
                    </p>

                    <nav className="mt-10 space-y-2">
                        <a
                            href="#dashboard"
                            className="block rounded-xl bg-violet-500/15 px-4 py-3 font-medium text-violet-300"
                        >
                            ◈ Dashboard
                        </a>
                        <a
                            href="#projects"
                            className="block rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
                        >
                            ▦ Proyek
                        </a>
                        <a
                            href="#tasks"
                            className="block rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
                        >
                            ☑ Tugas
                        </a>
                        <a
                            href="/settings/ai"
                            className="block rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
                        >
                            ⚙ Pengaturan AI
                        </a>
                        <a
                            href="/help"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                        >
                            <span aria-hidden="true">?</span>
                            Bantuan
                        </a>
                    </nav>

                    <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-sm font-semibold">Satu langkah setiap hari.</p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                            Ide besar dimulai dari pekerjaan kecil yang selesai.
                        </p>
                    </div>
                </aside>

                <section id="dashboard" className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">

                    <header className="flex flex-wrap items-center justify-between gap-4">

                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((open) => !open)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-500/10 md:hidden"
                            aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 6l12 12M18 6L6 18"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4 7h16M4 12h16M4 17h16"
                                    />
                                </svg>
                            )}
                        </button>

                        <div>
                            <p className="text-sm text-slate-400">
                                Personal workspace / Dashboard
                            </p>

                            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                                Bangun sesuatu yang hebat.
                            </h1>

                            <p className="mt-3 text-slate-400">
                                Selamat datang di ForgeOS. Mari wujudkan idemu.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-300">
                                ● Sistem siap
                            </span>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
                            >
                                Logout
                            </button>
                        </div>
                    </header>


                    {mobileMenuOpen && (
                        <nav
                            aria-label="Navigasi mobile"
                            className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-xl md:hidden"
                        >
                            <a
                                href="#dashboard"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 rounded-xl bg-violet-500/15 px-4 py-3 font-medium text-violet-300 transition hover:bg-violet-500/20"
                            >
                                <span aria-hidden="true">◈</span>
                                Dashboard
                            </a>

                            <a
                                href="#projects"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-white/5 hover:text-white"
                            >
                                <span aria-hidden="true">▦</span>
                                Proyek
                            </a>

                            <a
                                href="#tasks"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-white/5 hover:text-white"
                            >
                                <span aria-hidden="true">☑</span>
                                Tugas
                            </a>

                            <a
                                href="/settings/ai"
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-white/5 hover:text-white"
                            >
                                <span aria-hidden="true">⚙</span>
                                Pengaturan AI
                            </a>
                        </nav>
                    )}

                    <section className="mt-8 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-slate-900 to-slate-950 p-5 sm:p-7">
                        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                                    ForgeOS Intelligence
                                </p>

                                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                                    AI Command Center
                                </h2>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                                    Ubah ide menjadi rencana proyek yang terstruktur.
                                    Mulai dengan menjelaskan apa yang ingin kamu bangun.
                                </p>
                            </div>

                            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-300">
                                AI Workspace
                            </span>
                        </div>

                        <form
                            className="space-y-3"
                            onSubmit={generateProjectPlan}
                        >
                            <label
                                htmlFor="ai-goal"
                                className="block text-sm font-medium text-slate-200"
                            >
                                Apa yang ingin kamu bangun?
                            </label>

                            <textarea
                                id="ai-goal"
                                value={aiGoal}
                                onChange={(event) => {
                                    setAiGoal(event.target.value);
                                    setAiError("");
                                }}
                                placeholder="Contoh: Bangun MVP aplikasi pencatat keuangan pribadi dalam 14 hari..."
                                rows={4}
                                maxLength={2000}
                                required
                                disabled={isGeneratingPlan}
                                className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10 disabled:opacity-50"
                            />


                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p
                                    className={`text-xs ${aiGoal.length >= 1900
                                        ? "text-amber-300"
                                        : "text-slate-500"
                                        }`}
                                    aria-live="polite"
                                >
                                    {aiGoal.length.toLocaleString("id-ID")} / 2.000 karakter
                                </p>



                                <button
                                    type="submit"
                                    disabled={!aiGoal.trim() || isGeneratingPlan}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition duration-200 hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-900/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                                >
                                    {isGeneratingPlan ? (
                                        <>
                                            <svg
                                                className="h-4 w-4 animate-spin"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                />
                                            </svg>
                                            Menyusun rencana...
                                        </>
                                    ) : (
                                        <>
                                            Buat Rencana Proyek
                                            <span aria-hidden="true">→</span>
                                        </>
                                    )}
                                </button>

                            </div>
                        </form>

                        {aiError && (
                            <p
                                role="status"
                                className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200"
                            >
                                {aiError}
                            </p>
                        )}

                        {aiPlan && (
                            <div className="mt-6 overflow-hidden rounded-2xl border border-violet-400/20 bg-slate-950/70 shadow-xl shadow-violet-950/10">
                                <div className="border-b border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10 p-5 sm:p-6">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-300">
                                                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                                                Rencana proyek AI
                                            </div>

                                            <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                                                {aiPlan.projectName}
                                            </h3>

                                            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                                                {aiPlan.projectDescription}
                                            </p>
                                        </div>

                                        <div className="shrink-0 rounded-xl border border-violet-400/20 bg-slate-900/80 px-4 py-3">
                                            <p className="text-xs text-slate-400">
                                                Estimasi durasi
                                            </p>

                                            <p className="mt-1 text-2xl font-bold text-violet-300">
                                                {aiPlan.estimatedDays}
                                                <span className="ml-1 text-sm font-medium">
                                                    hari
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
                                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                                            <p className="text-xs text-slate-400">
                                                Total tugas
                                            </p>
                                            <p className="mt-1 text-xl font-semibold text-white">
                                                {aiPlan.tasks.length}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                                            <p className="text-xs text-slate-400">
                                                Prioritas tinggi
                                            </p>
                                            <p className="mt-1 text-xl font-semibold text-red-300">
                                                {aiPlan.tasks.filter(
                                                    (task) => task.priority === "high"
                                                ).length}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
                                    <div>
                                        <h4 className="text-base font-semibold text-white">
                                            Rencana pelaksanaan
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            {aiPlan.tasks.length} tugas yang disusun berdasarkan target hari
                                        </p>
                                    </div>

                                    <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300">
                                        {aiPlan.tasks.length} tugas
                                    </span>
                                </div>

                                <div className="mt-4 space-y-3 px-5 pb-2 sm:px-6">
                                    {aiPlan.tasks.map((task, index) => (
                                        <article
                                            key={`${task.day}-${index}`}
                                            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.025] p-4 transition duration-200 hover:border-violet-400/30 hover:bg-violet-400/[0.035] sm:p-5"
                                        >
                                            <div className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-violet-500/70 to-indigo-500/20 opacity-60 transition group-hover:opacity-100" />
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h5 className="text-sm font-medium text-white">
                                                    {index + 1}. {task.title}
                                                </h5>

                                                <span
                                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${task.priority === "high"
                                                        ? "border-red-400/20 bg-red-400/10 text-red-300"
                                                        : task.priority === "medium"
                                                            ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                                                            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                                        }`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${task.priority === "high"
                                                            ? "bg-red-400"
                                                            : task.priority === "medium"
                                                                ? "bg-amber-400"
                                                                : "bg-emerald-400"
                                                            }`}
                                                        aria-hidden="true"
                                                    />

                                                    {task.priority === "high"
                                                        ? "Prioritas tinggi"
                                                        : task.priority === "medium"
                                                            ? "Prioritas sedang"
                                                            : "Prioritas rendah"}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                                {task.description}
                                            </p>

                                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-2 rounded-lg border border-violet-400/15 bg-violet-400/[0.07] px-3 py-1.5 text-xs font-medium text-violet-300">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-3.5 w-3.5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={1.8}
                                                        aria-hidden="true"
                                                    >
                                                        <rect
                                                            x="3"
                                                            y="5"
                                                            width="18"
                                                            height="16"
                                                            rx="2"
                                                        />
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M16 3v4M8 3v4M3 11h18"
                                                        />
                                                    </svg>

                                                    Target hari ke-{task.day}
                                                </span>
                                            </div>
                                        </article>
                                    ))}

                                </div>

                                {savePlanError && (
                                    <p
                                        role="alert"
                                        className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300"
                                    >
                                        {savePlanError}
                                    </p>
                                )}


                                <button
                                    type="button"
                                    onClick={saveAiPlan}
                                    disabled={isSavingPlan}
                                    className="mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/25 transition duration-200 hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-900/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:w-auto"
                                >
                                    {isSavingPlan ? (
                                        <>
                                            <svg
                                                className="h-4 w-4 animate-spin"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                />
                                            </svg>
                                            Menyimpan proyek...
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={1.8}
                                                aria-hidden="true"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M12 5v14m-7-7h14"
                                                />
                                            </svg>
                                            Simpan sebagai Proyek
                                        </>
                                    )}
                                </button>

                            </div>
                        )}


                    </section>



                    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <StatCard
                            label="Total proyek"
                            value={String(projects.length)}
                            detail="Proyek yang sedang kamu kelola"
                            symbol="◈"
                        />
                        <StatCard
                            label="Tugas selesai"
                            value={`${completed}/${allTasks.length}`}
                            detail="Tugas yang sudah dituntaskan"
                            symbol="✓"
                        />
                        <StatCard
                            label="Progres keseluruhan"
                            value={`${progress}%`}
                            detail="Berdasarkan semua tugas"
                            symbol="↗"
                        />
                    </div>

                    <div className="mt-10 grid items-start gap-8 xl:grid-cols-[1.4fr_1fr]">
                        <section id="projects">
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold">Proyekmu</h2>
                                    <p className="mt-1 text-sm text-slate-400">
                                        Ubah tujuan menjadi langkah nyata.
                                    </p>
                                </div>
                            </div>

                            <form
                                onSubmit={addProject}
                                className="mb-5 flex gap-2 rounded-2xl border border-white/10 bg-slate-900 p-3"
                            >
                                <input
                                    value={newProject}
                                    onChange={(event) => setNewProject(event.target.value)}
                                    placeholder="Nama proyek baru..."
                                    aria-label="Nama proyek baru"
                                    className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-500"
                                />

                                <button
                                    type="submit"
                                    disabled={isSavingProject}
                                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSavingProject ? "Menyimpan..." : "+ Tambah"}
                                </button>

                            </form>

                            {notice && (
                                <p
                                    role="status"
                                    aria-live="polite"
                                    className={`mb-4 rounded-xl border px-4 py-3 text-sm ${notice.toLowerCase().includes("gagal") ||
                                        notice.toLowerCase().includes("tidak valid") ||
                                        notice.toLowerCase().includes("ditolak")
                                        ? "border-red-400/20 bg-red-400/10 text-red-300"
                                        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                        }`}
                                >
                                    {notice}
                                </p>
                            )}

                            {dbError && (
                                <div
                                    role="alert"
                                    className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                                >
                                    <p className="font-semibold">Gagal memuat dashboard</p>
                                    <p className="mt-1">{dbError}</p>
                                    <button
                                        type="button"
                                        onClick={() => window.location.reload()}
                                        className="mt-3 rounded-lg border border-red-300/20 px-3 py-2 font-medium transition hover:bg-red-400/10"
                                    >
                                        Coba muat ulang
                                    </button>
                                </div>
                            )}


                            <div className="space-y-4">
                                {projects.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 px-6 py-10 text-center">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                className="h-7 w-7 text-violet-300"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M12 5v14m-7-7h14"
                                                />
                                            </svg>
                                        </div>

                                        <h3 className="mt-4 font-semibold text-white">
                                            Belum ada proyek
                                        </h3>

                                        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
                                            Mulai bangun idemu. Buat proyek pertama dan kelola semua
                                            tugasnya langsung dari ForgeOS.
                                        </p>

                                        <p className="mt-4 text-xs text-violet-300">
                                            Gunakan formulir Tambah Proyek di atas untuk memulai.
                                        </p>
                                    </div>
                                ) : (
                                    projects.map((project) => {
                                        const done = project.tasks.filter(
                                            (task) => task.done
                                        ).length;

                                        const percent = project.tasks.length
                                            ? Math.round(
                                                (done / project.tasks.length) * 100
                                            )
                                            : 0;

                                        return (
                                            <article
                                                key={project.id}
                                                className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 transition hover:border-violet-400/30"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <span
                                                        className={`h-11 w-11 shrink-0 rounded-xl ${project.color}`}
                                                    />


                                                    <div className="min-w-0 flex-1">
                                                        {editingProjectId === project.id ? (
                                                            <form
                                                                className="space-y-3"
                                                                onSubmit={async (event) => {
                                                                    event.preventDefault();
                                                                    await updateProject(project.id);
                                                                }}
                                                            >
                                                                <input
                                                                    type="text"
                                                                    value={editProjectName}
                                                                    onChange={(event) =>
                                                                        setEditProjectName(event.target.value)
                                                                    }
                                                                    placeholder="Nama proyek"
                                                                    aria-label="Nama proyek"
                                                                    required
                                                                    maxLength={100}
                                                                    disabled={isSavingProject}
                                                                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
                                                                />

                                                                <textarea
                                                                    value={editProjectDescription}
                                                                    onChange={(event) =>
                                                                        setEditProjectDescription(event.target.value)
                                                                    }
                                                                    placeholder="Deskripsi proyek"
                                                                    aria-label="Deskripsi proyek"
                                                                    rows={2}
                                                                    maxLength={500}
                                                                    disabled={isSavingProject}
                                                                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
                                                                />

                                                                <div className="flex flex-wrap gap-2">
                                                                    <button
                                                                        type="submit"
                                                                        disabled={isSavingProject}
                                                                        className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        {isSavingProject
                                                                            ? "Menyimpan..."
                                                                            : "Simpan Perubahan"}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        disabled={isSavingProject}
                                                                        onClick={() => {
                                                                            setEditingProjectId(null);
                                                                            setEditProjectName("");
                                                                            setEditProjectDescription("");
                                                                        }}
                                                                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                                                                    >
                                                                        Batal
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        ) : (
                                                            <>
                                                                <h3 className="font-semibold">{project.name}</h3>

                                                                <p className="mt-1 text-sm text-slate-400">
                                                                    {project.description}
                                                                </p>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingProjectId(project.id);
                                                                        setEditProjectName(project.name);
                                                                        setEditProjectDescription(project.description);
                                                                        setNotice("");
                                                                    }}
                                                                    className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition hover:border-violet-400/30 hover:bg-violet-400/10"
                                                                >
                                                                    Edit Proyek
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        deletingProjectId !== null ||
                                                                        editingProjectId === project.id
                                                                    }
                                                                    onClick={() => deleteProject(project.id)}
                                                                    className="mt-3 ml-2 rounded-lg border border-red-400/20 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:border-red-400/40 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    {deletingProjectId === project.id
                                                                        ? "Menghapus..."
                                                                        : "Hapus Proyek"}
                                                                </button>

                                                            </>
                                                        )}
                                                    </div>


                                                    <span className="text-sm font-medium text-violet-300">
                                                        {percent}%
                                                    </span>
                                                </div>

                                                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                                                    <div
                                                        className="h-full rounded-full bg-violet-500 transition-all"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>

                                                <p className="mt-3 text-xs text-slate-500">
                                                    {done} dari {project.tasks.length} tugas selesai
                                                </p>

                                                <form
                                                    className="mt-4 flex flex-col gap-2 sm:flex-row"
                                                    onSubmit={async (event) => {
                                                        event.preventDefault();

                                                        const saved = await addTask(project.id, newTaskTitle);

                                                        if (saved) {
                                                            setNewTaskTitle("");
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="text"
                                                        value={newTaskTitle}
                                                        onChange={(event) => setNewTaskTitle(event.target.value)}
                                                        placeholder="Nama tugas baru..."
                                                        aria-label={`Nama tugas untuk ${project.name}`}
                                                        maxLength={200}
                                                        required
                                                        disabled={isSavingTask}
                                                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
                                                    />

                                                    <button
                                                        type="submit"
                                                        disabled={isSavingTask || !newTaskTitle.trim()}
                                                        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {isSavingTask ? "Menyimpan..." : "+ Tambah Tugas"}
                                                    </button>
                                                </form>

                                            </article>
                                        );
                                    })
                                )}
                            </div>

                        </section>


                        <section id="tasks">
                            <div className="mb-5">
                                <h2 className="text-xl font-semibold">Kanban Board</h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Pindahkan tugas sesuai progres pekerjaanmu.
                                </p>
                            </div>

                            <div className="mb-4 flex flex-wrap gap-2 text-sm">
                                <span className="rounded-lg bg-slate-800 px-3 py-2">
                                    Total: {allTasks.length}
                                </span>
                                <span className="rounded-lg bg-blue-500/10 px-3 py-2 text-blue-300">
                                    To Do: {allTasks.filter((task) => task.status === "todo").length}
                                </span>
                                <span className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-300">
                                    In Progress: {allTasks.filter((task) => task.status === "in_progress").length}
                                </span>
                                <span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-300">
                                    Done: {allTasks.filter((task) => task.status === "done").length}
                                </span>
                            </div>

                            <DndContext
                                sensors={sensors}
                                onDragEnd={handleKanbanDragEnd}
                            >
                                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
                                    {([
                                        {
                                            id: "todo",
                                            title: "To Do",
                                            description: "Belum dikerjakan",
                                            color: "border-blue-400/20",
                                        },
                                        {
                                            id: "in_progress",
                                            title: "In Progress",
                                            description: "Sedang dikerjakan",
                                            color: "border-amber-400/20",
                                        },
                                        {
                                            id: "done",
                                            title: "Done",
                                            description: "Sudah selesai",
                                            color: "border-emerald-400/20",
                                        },
                                    ] as const).map((column) => {
                                        const columnTasks = projects.flatMap((project) =>
                                            project.tasks
                                                .filter((task) => task.status === column.id)
                                                .map((task) => ({ ...task, project }))
                                        );

                                        return (
                                            <div
                                                key={column.id}
                                                className={`min-w-0 rounded-2xl border ${column.color} bg-slate-900/70 p-3`}
                                            >
                                                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                                                    <div>
                                                        <h3 className="font-semibold text-white">
                                                            {column.title}
                                                        </h3>
                                                        <p className="mt-1 text-xs text-slate-400">
                                                            {column.description}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300">
                                                        {columnTasks.length}
                                                    </span>
                                                </div>

                                                <DroppableKanbanColumn id={column.id}>
                                                    {columnTasks.length === 0 ? (
                                                        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500">
                                                            Belum ada tugas
                                                        </p>
                                                    ) : (
                                                        columnTasks.map((task) => (
                                                            <DraggableTaskCard
                                                                key={`${task.project.id}-${task.id}`}
                                                                id={`${task.project.id}:${task.id}`}
                                                            >

                                                                <p className={`break-words text-sm font-medium ${task.status === "done"
                                                                    ? "text-slate-400 line-through"
                                                                    : "text-slate-100"
                                                                    }`}>
                                                                    {task.title}
                                                                </p>

                                                                <p className="mt-2 text-xs text-violet-300">
                                                                    {task.project.name}
                                                                </p>
                                                                {task.description && (
                                                                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                                                                        {task.description}
                                                                    </p>
                                                                )}

                                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                                    <span
                                                                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${task.priority === "high"
                                                                            ? "bg-red-400/10 text-red-300"
                                                                            : task.priority === "low"
                                                                                ? "bg-emerald-400/10 text-emerald-300"
                                                                                : "bg-amber-400/10 text-amber-300"
                                                                            }`}
                                                                    >
                                                                        Prioritas: {
                                                                            task.priority === "high"
                                                                                ? "Tinggi"
                                                                                : task.priority === "low"
                                                                                    ? "Rendah"
                                                                                    : "Sedang"
                                                                        }
                                                                    </span>

                                                                    <span className="rounded-full bg-violet-400/10 px-2 py-1 text-[10px] text-violet-300">
                                                                        Hari ke-{task.day}
                                                                    </span>
                                                                </div>
                                                                <label className="mt-3 block text-xs text-slate-400">
                                                                    Ubah status
                                                                </label>
                                                                <select
                                                                    value={task.status}
                                                                    onChange={(event) =>
                                                                        moveTaskStatus(
                                                                            task.project.id,
                                                                            task.id,
                                                                            event.target.value as Task["status"]
                                                                        )
                                                                    }
                                                                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-white"
                                                                    aria-label={`Status tugas ${task.title}`}
                                                                >
                                                                    <option value="todo">To Do</option>
                                                                    <option value="in_progress">In Progress</option>
                                                                    <option value="done">Done</option>
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    disabled={isSavingTaskEdit || deletingTaskId !== null}
                                                                    onClick={() => startEditingTask(task.project.id, task)}
                                                                    className="mt-3 mr-2 rounded-lg border border-violet-400/20 px-3 py-2 text-xs text-violet-300 transition hover:bg-violet-400/10 disabled:opacity-50"
                                                                >
                                                                    Edit tugas
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={deletingTaskId !== null}
                                                                    onClick={() =>
                                                                        deleteTask(task.project.id, task.id)
                                                                    }
                                                                    className="mt-3 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                                                                >
                                                                    {deletingTaskId === task.id
                                                                        ? "Menghapus..."
                                                                        : "Hapus tugas"}
                                                                </button>
                                                            </DraggableTaskCard>
                                                        ))
                                                    )}
                                                </DroppableKanbanColumn>
                                            </div>
                                        );
                                    })}
                                </div>
                            </DndContext>
                        </section>


                        {editingTaskId !== null && editingTaskProjectId !== null && (
                            <div
                                className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-6"
                                onClick={(event) => {
                                    if (event.target === event.currentTarget && !isSavingTaskEdit) {
                                        cancelEditingTask();
                                    }
                                }}
                            >
                                <section
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="edit-task-modal-title"
                                    className="my-auto w-full max-w-3xl rounded-2xl border border-violet-400/20 bg-slate-900 p-5 shadow-2xl sm:p-8"
                                >
                                    <div className="mb-6 flex items-start justify-between gap-4">
                                        <div>
                                            <h2
                                                id="edit-task-modal-title"
                                                className="text-xl font-semibold text-white sm:text-2xl"
                                            >
                                                Edit tugas
                                            </h2>
                                            <p className="mt-2 text-sm text-slate-400">
                                                Ubah detail, prioritas, dan jadwal tugas.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={cancelEditingTask}
                                            disabled={isSavingTaskEdit}
                                            aria-label="Tutup formulir edit"
                                            className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5 disabled:opacity-50"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <form
                                        className="space-y-5"
                                        onSubmit={async (event) => {
                                            event.preventDefault();
                                            await saveTaskEdit(editingTaskProjectId, editingTaskId);
                                        }}
                                    >
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-300">
                                                Judul tugas
                                            </label>
                                            <input
                                                value={editTaskTitle}
                                                onChange={(event) => setEditTaskTitle(event.target.value)}
                                                maxLength={200}
                                                required
                                                disabled={isSavingTaskEdit}
                                                className="block w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none focus:border-violet-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-300">
                                                Deskripsi tugas
                                            </label>
                                            <textarea
                                                value={editTaskDescription}
                                                onChange={(event) =>
                                                    setEditTaskDescription(event.target.value)
                                                }
                                                maxLength={5000}
                                                rows={7}
                                                disabled={isSavingTaskEdit}
                                                placeholder="Jelaskan detail pekerjaan, langkah-langkah, atau hasil yang diharapkan..."
                                                className="block w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-violet-400"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                                    Prioritas
                                                </label>
                                                <select
                                                    value={editTaskPriority}
                                                    onChange={(event) =>
                                                        setEditTaskPriority(
                                                            event.target.value as Task["priority"]
                                                        )
                                                    }
                                                    disabled={isSavingTaskEdit}
                                                    className="block w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"
                                                >
                                                    <option value="low">Rendah</option>
                                                    <option value="medium">Sedang</option>
                                                    <option value="high">Tinggi</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                                    Hari pengerjaan
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={365}
                                                    step={1}
                                                    value={editTaskDay}
                                                    onChange={(event) =>
                                                        setEditTaskDay(event.target.value)
                                                    }
                                                    required
                                                    disabled={isSavingTaskEdit}
                                                    className="block w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
                                            <button
                                                type="button"
                                                onClick={cancelEditingTask}
                                                disabled={isSavingTaskEdit}
                                                className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
                                            >
                                                Batal
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={isSavingTaskEdit}
                                                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isSavingTaskEdit ? "Menyimpan..." : "Simpan perubahan"}
                                            </button>
                                        </div>
                                    </form>
                                </section>
                            </div>
                        )}


                    </div>

                    <footer className="mt-12 border-t border-white/10 pt-5 text-xs text-slate-500">
                        ForgeOS · Dibangun selangkah demi selangkah.
                    </footer>
                </section>
            </div>
        </main>
    );
}


function DraggableTaskCard({
    id,
    children,
}: {
    id: string;
    children: React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({ id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: transform
                    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
                    : undefined,
                opacity: isDragging ? 0.4 : 1,
                touchAction: "none",
            }}
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing"
        >
            {children}
        </div>
    );
}

function DroppableKanbanColumn({
    id,
    children,
}: {
    id: string;
    children: React.ReactNode;
}) {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`min-h-40 space-y-3 rounded-xl transition-colors ${isOver ? "bg-violet-500/10 ring-2 ring-violet-400/40" : ""
                }`}
        >
            {children}
        </div>
    );
}

function StatCard({
    label,
    value,
    detail,
    symbol,
}: {
    label: string;
    value: string;
    detail: string;
    symbol: string;
}) {
    return (
        <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{label}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-lg text-violet-300">
                    {symbol}
                </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </article>
    );
}
