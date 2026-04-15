import { useState, useEffect } from "react";

export function useTasks() {
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        const stored = localStorage.getItem('tasks');
        if (stored) setTasks(JSON.parse(stored));
    }, []);

    const addTask = (task) => {
        const update = [task, ...tasks];
        setTasks(update);
        localStorage.setItem('tasks', JSON.stringify(update));
    };

    const updateTask = () => {};

    const deleteTask = (id) => {
        const filtered = tasks.filter((t) => t.id !== id);
        setTasks(filtered);
        localStorage.setItem('tasks', JSON.stringify(filtered));
    };

    return { addTask, tasks, updateTask, deleteTask };
}
