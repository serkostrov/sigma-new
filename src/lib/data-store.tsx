import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  INITIAL_TASKS,
  INITIAL_OBJECT_COMMENTS,
  INITIAL_ESTIMATES,
  INITIAL_TOOLS,
  type Task,
  type TaskStatus,
  type ObjectComment,
  type Estimate,
  type EstimateItem,
  type EstimateStatus,
  type CatalogItem,
  type Tool,
  type ToolStatus,
  type ToolCondition,
} from "./demo-data";

interface Ctx {
  tasks: Task[];
  objectComments: ObjectComment[];
  estimates: Estimate[];
  tools: Tool[];
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  addTaskComment: (taskId: string, author: string, text: string) => void;
  addObjectComment: (objectId: string, author: string, text: string) => void;
  reportProblem: (objectId: string, author: string, text: string) => void;
  // Estimates
  addEstimateItem: (estimateId: string, item: CatalogItem) => void;
  setEstimateItemQty: (estimateId: string, itemId: string, qty: number) => void;
  removeEstimateItem: (estimateId: string, itemId: string) => void;
  setEstimateDiscount: (estimateId: string, discount: number) => void;
  setEstimateStatus: (estimateId: string, status: EstimateStatus) => void;
  // Tools
  issueTool: (toolId: string, input: { objectId: string; location: string; issuedTo: string; plannedReturn: string; comment?: string }) => void;
  returnTool: (toolId: string) => void;
  transferTool: (toolId: string, input: { objectId: string; location: string; issuedTo: string; plannedReturn: string }) => void;
  sendToolToRepair: (toolId: string, comment: string) => void;
  setToolCondition: (toolId: string, condition: ToolCondition) => void;
  setToolStatus: (toolId: string, status: ToolStatus) => void;
}

const Ctx0 = createContext<Ctx | null>(null);

const now = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `Сегодня, ${hh}:${mm}`;
};

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [objectComments, setObjectComments] = useState<ObjectComment[]>(INITIAL_OBJECT_COMMENTS);
  const [estimates, setEstimates] = useState<Estimate[]>(INITIAL_ESTIMATES);
  const [tools, setTools] = useState<Tool[]>(INITIAL_TOOLS);

  const setTaskStatus: Ctx["setTaskStatus"] = useCallback((taskId, status) => {
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status } : t)));
  }, []);

  const addTaskComment: Ctx["addTaskComment"] = useCallback((taskId, author, text) => {
    setTasks((ts) =>
      ts.map((t) =>
        t.id === taskId
          ? { ...t, comments: [...t.comments, { id: `c-${Date.now()}`, author, text, date: now() }] }
          : t,
      ),
    );
  }, []);

  const addObjectComment: Ctx["addObjectComment"] = useCallback((objectId, author, text) => {
    setObjectComments((cs) => [
      ...cs,
      { id: `oc-${Date.now()}`, objectId, author, text, date: now() },
    ]);
  }, []);

  const reportProblem: Ctx["reportProblem"] = useCallback((objectId, author, text) => {
    setObjectComments((cs) => [
      ...cs,
      { id: `oc-${Date.now()}`, objectId, author, text: `⚠ Проблема: ${text}`, date: now() },
    ]);
  }, []);

  // ----- Estimates -----
  const addEstimateItem: Ctx["addEstimateItem"] = useCallback((estimateId, c) => {
    setEstimates((es) =>
      es.map((e) => {
        if (e.id !== estimateId) return e;
        const existing = e.items.find((it) => it.name === c.name && it.section === c.section);
        if (existing) {
          return { ...e, items: e.items.map((it) => (it.id === existing.id ? { ...it, qty: it.qty + 1 } : it)) };
        }
        const item: EstimateItem = { id: `ei-${Date.now()}`, section: c.section, name: c.name, unit: c.unit, price: c.price, qty: 1 };
        return { ...e, items: [...e.items, item] };
      }),
    );
  }, []);

  const setEstimateItemQty: Ctx["setEstimateItemQty"] = useCallback((estimateId, itemId, qty) => {
    setEstimates((es) =>
      es.map((e) =>
        e.id === estimateId
          ? { ...e, items: e.items.map((it) => (it.id === itemId ? { ...it, qty: Math.max(0, qty) } : it)) }
          : e,
      ),
    );
  }, []);

  const removeEstimateItem: Ctx["removeEstimateItem"] = useCallback((estimateId, itemId) => {
    setEstimates((es) => es.map((e) => (e.id === estimateId ? { ...e, items: e.items.filter((it) => it.id !== itemId) } : e)));
  }, []);

  const setEstimateDiscount: Ctx["setEstimateDiscount"] = useCallback((estimateId, discount) => {
    setEstimates((es) => es.map((e) => (e.id === estimateId ? { ...e, discount: Math.max(0, Math.min(100, discount)) } : e)));
  }, []);

  const setEstimateStatus: Ctx["setEstimateStatus"] = useCallback((estimateId, status) => {
    setEstimates((es) => es.map((e) => (e.id === estimateId ? { ...e, status } : e)));
  }, []);

  // ----- Tools -----
  const today = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };
  const issueTool: Ctx["issueTool"] = useCallback((toolId, input) => {
    setTools((ts) => ts.map((t) => (t.id === toolId ? { ...t, status: "На объекте", objectId: input.objectId, location: input.location, issuedTo: input.issuedTo, issuedDate: today(), plannedReturn: input.plannedReturn, comment: input.comment ?? t.comment } : t)));
  }, []);
  const returnTool: Ctx["returnTool"] = useCallback((toolId) => {
    setTools((ts) => ts.map((t) => (t.id === toolId ? { ...t, status: "Свободен", objectId: undefined, location: "Склад", issuedTo: "—", issuedDate: "—", plannedReturn: "—" } : t)));
  }, []);
  const transferTool: Ctx["transferTool"] = useCallback((toolId, input) => {
    setTools((ts) => ts.map((t) => (t.id === toolId ? { ...t, status: "На объекте", objectId: input.objectId, location: input.location, issuedTo: input.issuedTo, issuedDate: today(), plannedReturn: input.plannedReturn } : t)));
  }, []);
  const sendToolToRepair: Ctx["sendToolToRepair"] = useCallback((toolId, comment) => {
    setTools((ts) => ts.map((t) => (t.id === toolId ? { ...t, status: "В ремонте", objectId: undefined, location: "Сервис «Инструмент-Сервис»", issuedTo: "—", condition: "Неисправно", comment: comment || t.comment } : t)));
  }, []);
  const setToolCondition: Ctx["setToolCondition"] = useCallback((toolId, condition) => {
    setTools((ts) => ts.map((t) => (t.id === toolId ? { ...t, condition } : t)));
  }, []);
  const setToolStatus: Ctx["setToolStatus"] = useCallback((toolId, status) => {
    setTools((ts) => ts.map((t) => (t.id === toolId ? { ...t, status } : t)));
  }, []);

  const value = useMemo(
    () => ({
      tasks, objectComments, estimates, tools,
      setTaskStatus, addTaskComment, addObjectComment, reportProblem,
      addEstimateItem, setEstimateItemQty, removeEstimateItem, setEstimateDiscount, setEstimateStatus,
      issueTool, returnTool, transferTool, sendToolToRepair, setToolCondition, setToolStatus,
    }),
    [tasks, objectComments, estimates, tools, setTaskStatus, addTaskComment, addObjectComment, reportProblem, addEstimateItem, setEstimateItemQty, removeEstimateItem, setEstimateDiscount, setEstimateStatus, issueTool, returnTool, transferTool, sendToolToRepair, setToolCondition, setToolStatus],
  );

  return <Ctx0.Provider value={value}>{children}</Ctx0.Provider>;
}

export function useData() {
  const v = useContext(Ctx0);
  if (!v) throw new Error("useData must be used inside DataStoreProvider");
  return v;
}