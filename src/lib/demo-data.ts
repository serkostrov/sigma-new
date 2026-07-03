export type ObjectStatus =
  | "Заявка"
  | "Замер"
  | "Смета"
  | "Согласование"
  | "В работе"
  | "Пауза"
  | "Завершен";

export type Health = "ok" | "questions" | "risk";

export const HEALTH_LABEL: Record<Health, string> = {
  ok: "Все в порядке",
  questions: "Есть вопросы",
  risk: "Риск просрочки",
};

export const STAGES = [
  "Черновая отделка",
  "Инженерия",
  "Предчистовая отделка",
  "Чистовая отделка",
  "Дополнительные работы",
] as const;
export type Stage = (typeof STAGES)[number];

export type StageStatus = "Не начат" | "В работе" | "Готово";

export interface SiteObject {
  id: string;
  name: string;
  address: string;
  customer: string;
  customerId?: string | null;
  responsible: string;
  status: ObjectStatus;
  foreman: string;
  foremanId?: string | null;
  brigade: string;
  brigadeId?: string | null;
  deadline: string;
  progress: number;
  budget: number;
  health: Health;
  risk: boolean;
  currentStage: Stage;
  stagesStatus: Record<Stage, StageStatus>;
}

export const OBJECTS: SiteObject[] = [
  {
    id: "obj-7",
    name: "Купчино, Пеники 24",
    address: "Лен. область, Купчино, Пеники, 24",
    customer: "Александр",
    responsible: "Кристина",
    status: "В работе",
    foreman: "Виктор Петрович",
    brigade: "Бригада №1",
    deadline: "12.09.2026",
    progress: 28,
    budget: 4_180_000,
    health: "ok",
    risk: false,
    currentStage: "Черновая отделка",
    stagesStatus: {
      "Черновая отделка": "В работе",
      "Инженерия": "Не начат",
      "Предчистовая отделка": "Не начат",
      "Чистовая отделка": "Не начат",
      "Дополнительные работы": "Не начат",
    },
  },
  {
    id: "obj-1",
    name: "Репинские усадьбы",
    address: "пос. Репино, уч. 12",
    customer: "Семья Морозовых",
    responsible: "Александр Кузьмин",
    status: "В работе",
    foreman: "Виктор Петрович",
    brigade: "Бригада №1",
    deadline: "30.06.2026",
    progress: 62,
    budget: 4_850_000,
    health: "risk",
    risk: true,
    currentStage: "Предчистовая отделка",
    stagesStatus: {
      "Черновая отделка": "Готово",
      "Инженерия": "Готово",
      "Предчистовая отделка": "В работе",
      "Чистовая отделка": "Не начат",
      "Дополнительные работы": "Не начат",
    },
  },
  {
    id: "obj-2",
    name: "Грибоедова 80",
    address: "наб. кан. Грибоедова, 80",
    customer: "ООО «Эверест»",
    responsible: "Александр Кузьмин",
    status: "В работе",
    foreman: "Виктор Петрович",
    brigade: "Бригада №2",
    deadline: "15.07.2026",
    progress: 48,
    budget: 3_120_000,
    health: "questions",
    risk: false,
    currentStage: "Инженерия",
    stagesStatus: {
      "Черновая отделка": "Готово",
      "Инженерия": "В работе",
      "Предчистовая отделка": "Не начат",
      "Чистовая отделка": "Не начат",
      "Дополнительные работы": "Не начат",
    },
  },
  {
    id: "obj-3",
    name: "Энгельса 29",
    address: "пр. Энгельса, 29",
    customer: "Иванов А. С.",
    responsible: "Кристина",
    status: "Согласование",
    foreman: "Виктор Петрович",
    brigade: "—",
    deadline: "10.08.2026",
    progress: 10,
    budget: 2_400_000,
    health: "ok",
    risk: false,
    currentStage: "Черновая отделка",
    stagesStatus: {
      "Черновая отделка": "Не начат",
      "Инженерия": "Не начат",
      "Предчистовая отделка": "Не начат",
      "Чистовая отделка": "Не начат",
      "Дополнительные работы": "Не начат",
    },
  },
  {
    id: "obj-4",
    name: "Московский 183/185",
    address: "Московский пр., 183/185",
    customer: "Петрова Е. В.",
    responsible: "Кристина",
    status: "Смета",
    foreman: "Виктор Петрович",
    brigade: "—",
    deadline: "25.08.2026",
    progress: 5,
    budget: 5_700_000,
    health: "ok",
    risk: false,
    currentStage: "Черновая отделка",
    stagesStatus: {
      "Черновая отделка": "Не начат",
      "Инженерия": "Не начат",
      "Предчистовая отделка": "Не начат",
      "Чистовая отделка": "Не начат",
      "Дополнительные работы": "Не начат",
    },
  },
  {
    id: "obj-5",
    name: "Съезжинская 14",
    address: "ул. Съезжинская, 14",
    customer: "Соколов Д. М.",
    responsible: "Александр Кузьмин",
    status: "В работе",
    foreman: "Виктор Петрович",
    brigade: "Бригада №1",
    deadline: "05.06.2026",
    progress: 78,
    budget: 2_980_000,
    health: "risk",
    risk: true,
    currentStage: "Чистовая отделка",
    stagesStatus: {
      "Черновая отделка": "Готово",
      "Инженерия": "Готово",
      "Предчистовая отделка": "Готово",
      "Чистовая отделка": "В работе",
      "Дополнительные работы": "Не начат",
    },
  },
  {
    id: "obj-6",
    name: "Парфеновская 6к2",
    address: "ул. Парфеновская, 6к2",
    customer: "Лебедева О. И.",
    responsible: "Кристина",
    status: "Пауза",
    foreman: "Виктор Петрович",
    brigade: "—",
    deadline: "—",
    progress: 35,
    budget: 1_850_000,
    health: "questions",
    risk: false,
    currentStage: "Инженерия",
    stagesStatus: {
      "Черновая отделка": "Готово",
      "Инженерия": "В работе",
      "Предчистовая отделка": "Не начат",
      "Чистовая отделка": "Не начат",
      "Дополнительные работы": "Не начат",
    },
  },
];

export type TaskStatus =
  | "Не начата"
  | "В работе"
  | "На проверке"
  | "Выполнена"
  | "Есть проблема";

export interface Task {
  id: string;
  title: string;
  objectId: string;
  stage: Stage;
  assignee: string;
  due: string;
  status: TaskStatus;
  priority: "Низкий" | "Средний" | "Высокий";
  today?: boolean;
  comments: { id: string; author: string; text: string; date: string }[];
  photoIds: string[];
}

export const INITIAL_TASKS: Task[] = [
  { id: "t-p1", title: "Демонтаж старой стяжки в зале", objectId: "obj-7", stage: "Черновая отделка", assignee: "Бригада №1", due: "Сегодня", status: "В работе", priority: "Высокий", today: true, comments: [{ id: "c-p1", author: "Виктор Петрович", text: "Бригада на объекте, демонтаж идёт по графику", date: "Сегодня, 09:25" }], photoIds: ["p-p1"] },
  { id: "t-p2", title: "Штробление под электрику в кухне", objectId: "obj-7", stage: "Черновая отделка", assignee: "Бригада №1", due: "Сегодня", status: "Не начата", priority: "Средний", today: true, comments: [], photoIds: [] },
  { id: "t-p3", title: "Вывоз строительного мусора", objectId: "obj-7", stage: "Черновая отделка", assignee: "Виктор Петрович", due: "Завтра", status: "Не начата", priority: "Средний", comments: [], photoIds: [] },
  { id: "t-p4", title: "Замер оконных проёмов", objectId: "obj-7", stage: "Черновая отделка", assignee: "Виктор Петрович", due: "Сегодня", status: "Выполнена", priority: "Низкий", today: true, comments: [], photoIds: ["p-p2"] },
  { id: "t-p5", title: "Согласовать раскладку плитки санузла", objectId: "obj-7", stage: "Черновая отделка", assignee: "Кристина", due: "25.05", status: "В работе", priority: "Высокий", comments: [], photoIds: [] },
  { id: "t1", title: "Залить стяжку 2 этаж", objectId: "obj-1", stage: "Черновая отделка", assignee: "Бригада №1", due: "Сегодня", status: "В работе", priority: "Высокий", today: true, comments: [{ id: "c1", author: "Виктор Петрович", text: "Раствор привезли, начали работу", date: "Сегодня, 10:15" }], photoIds: ["p1"] },
  { id: "t2", title: "Привезти гипсокартон", objectId: "obj-2", stage: "Черновая отделка", assignee: "Виктор Петрович", due: "Сегодня", status: "Не начата", priority: "Средний", today: true, comments: [], photoIds: [] },
  { id: "t3", title: "Проверка электрики", objectId: "obj-5", stage: "Инженерия", assignee: "Виктор Петрович", due: "Сегодня", status: "На проверке", priority: "Высокий", today: true, comments: [{ id: "c2", author: "Бригада №1", text: "Все линии прозвонены, готово к проверке", date: "Сегодня, 11:00" }], photoIds: ["p2"] },
  { id: "t4", title: "Согласовать смету с заказчиком", objectId: "obj-3", stage: "Черновая отделка", assignee: "Кристина", due: "Сегодня", status: "В работе", priority: "Средний", today: true, comments: [], photoIds: [] },
  { id: "t5", title: "Замер помещения", objectId: "obj-7", stage: "Черновая отделка", assignee: "Виктор Петрович", due: "Завтра", status: "Не начата", priority: "Средний", comments: [], photoIds: [] },
  { id: "t6", title: "Демонтаж старой плитки", objectId: "obj-2", stage: "Черновая отделка", assignee: "Бригада №2", due: "25.05", status: "В работе", priority: "Низкий", comments: [], photoIds: ["p3"] },
  { id: "t7", title: "Закрыть акт по объекту", objectId: "obj-6", stage: "Дополнительные работы", assignee: "Кристина", due: "26.05", status: "Не начата", priority: "Высокий", comments: [], photoIds: [] },
  { id: "t8", title: "Монтаж розеток в кухне", objectId: "obj-1", stage: "Инженерия", assignee: "Бригада №1", due: "Сегодня", status: "Есть проблема", priority: "Высокий", today: true, comments: [{ id: "c3", author: "Бригада №1", text: "Не хватает подрозетников, нужен запас", date: "Сегодня, 13:40" }], photoIds: [] },
  { id: "t9", title: "Шпаклевка стен спальни", objectId: "obj-5", stage: "Предчистовая отделка", assignee: "Бригада №1", due: "Сегодня", status: "Выполнена", priority: "Средний", today: true, comments: [], photoIds: [] },
];

export interface PhotoReport {
  id: string;
  objectId: string;
  author: string;
  date: string;
  note: string;
  count: number;
  taskId?: string;
  stageId?: string;
  thumb: string; // tailwind gradient class
  images?: string[]; // data URLs of uploaded photos
}

const THUMBS = [
  "from-amber-200 via-orange-300 to-rose-300",
  "from-sky-200 via-blue-300 to-indigo-300",
  "from-emerald-200 via-teal-300 to-cyan-300",
  "from-stone-300 via-stone-400 to-slate-500",
  "from-yellow-200 via-amber-300 to-orange-400",
  "from-violet-200 via-purple-300 to-fuchsia-300",
];
export const thumbForId = (id: string) =>
  THUMBS[Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % THUMBS.length];

export const INITIAL_PHOTOS: PhotoReport[] = [
  { id: "p-p1", objectId: "obj-7", author: "Бригада №1", date: "Сегодня, 12:35", note: "Демонтаж старой стяжки — зал, день 1", count: 8, taskId: "t-p1", thumb: thumbForId("p-p1") },
  { id: "p-p2", objectId: "obj-7", author: "Виктор Петрович", date: "Сегодня, 10:10", note: "Замер оконных проёмов — все размеры зафиксированы", count: 5, taskId: "t-p4", thumb: thumbForId("p-p2") },
  { id: "p-p3", objectId: "obj-7", author: "Виктор Петрович", date: "Вчера, 17:20", note: "Состояние объекта на старте работ", count: 12, thumb: thumbForId("p-p3") },
  { id: "p-p4", objectId: "obj-7", author: "Бригада №1", date: "Вчера, 14:00", note: "Подготовка площадки и разметка стен", count: 6, thumb: thumbForId("p-p4") },
  { id: "p1", objectId: "obj-1", author: "Бригада №1", date: "Сегодня, 14:20", note: "Стяжка 2 этаж — заливка завершена", count: 6, taskId: "t1", thumb: thumbForId("p1") },
  { id: "p2", objectId: "obj-5", author: "Виктор Петрович", date: "Сегодня, 11:05", note: "Прокладка электрики в кухне", count: 4, taskId: "t3", thumb: thumbForId("p2") },
  { id: "p3", objectId: "obj-2", author: "Бригада №2", date: "Вчера, 18:40", note: "Демонтаж стен — день 2", count: 9, taskId: "t6", thumb: thumbForId("p3") },
  { id: "p4", objectId: "obj-1", author: "Бригада №1", date: "Вчера, 12:10", note: "Подготовка пола", count: 5, thumb: thumbForId("p4") },
  { id: "p5", objectId: "obj-6", author: "Виктор Петрович", date: "20.05, 16:30", note: "Состояние объекта на паузе", count: 3, thumb: thumbForId("p5") },
];

export interface Estimate {
  id: string;
  number: string;
  objectId: string;
  status: EstimateStatus;
  customer: string;
  manager: string;
  discount: number; // percent
  items: EstimateItem[];
  updated: string;
}

export type EstimateStatus = "Черновик" | "Отправлена" | "На согласовании" | "Согласована";

export const ESTIMATE_SECTIONS = [
  "Демонтаж",
  "Потолки",
  "Стены",
  "Полы",
  "Сантехника",
  "Штробление",
  "Электрика",
  "Столярные работы",
  "Пластиковые окна",
  "Спецмонтаж",
  "Прочее",
] as const;
export type EstimateSection = (typeof ESTIMATE_SECTIONS)[number];

export interface CatalogItem {
  id: string;
  section: EstimateSection;
  name: string;
  unit: string;
  price: number;
}

export interface EstimateItem {
  id: string;
  section: EstimateSection;
  name: string;
  unit: string;
  price: number;
  qty: number;
}

export const ESTIMATE_CATALOG: CatalogItem[] = [
  { id: "c-d1", section: "Демонтаж", name: "Демонтаж перегородок из кирпича", unit: "м²", price: 650 },
  { id: "c-d2", section: "Демонтаж", name: "Демонтаж старой стяжки", unit: "м²", price: 420 },
  { id: "c-d3", section: "Демонтаж", name: "Демонтаж напольной плитки", unit: "м²", price: 380 },
  { id: "c-d4", section: "Демонтаж", name: "Вынос строительного мусора", unit: "мешок", price: 180 },

  { id: "c-pt1", section: "Потолки", name: "Монтаж натяжного потолка", unit: "м²", price: 850 },
  { id: "c-pt2", section: "Потолки", name: "Шпатлёвка потолка под покраску", unit: "м²", price: 540 },
  { id: "c-pt3", section: "Потолки", name: "Покраска потолка в 2 слоя", unit: "м²", price: 320 },
  { id: "c-pt4", section: "Потолки", name: "Монтаж ГКЛ-потолка в 2 уровня", unit: "м²", price: 1450 },

  { id: "c-st1", section: "Стены", name: "Штукатурка стен по маякам", unit: "м²", price: 780 },
  { id: "c-st2", section: "Стены", name: "Шпатлёвка стен под покраску", unit: "м²", price: 520 },
  { id: "c-st3", section: "Стены", name: "Поклейка обоев", unit: "м²", price: 380 },
  { id: "c-st4", section: "Стены", name: "Укладка плитки на стену", unit: "м²", price: 1450 },

  { id: "c-pl1", section: "Полы", name: "Цементно-песчаная стяжка", unit: "м²", price: 720 },
  { id: "c-pl2", section: "Полы", name: "Укладка ламината", unit: "м²", price: 480 },
  { id: "c-pl3", section: "Полы", name: "Укладка плитки на пол", unit: "м²", price: 1380 },
  { id: "c-pl4", section: "Полы", name: "Монтаж тёплого пола (электрика)", unit: "м²", price: 950 },

  { id: "c-sn1", section: "Сантехника", name: "Установка унитаза", unit: "шт.", price: 4500 },
  { id: "c-sn2", section: "Сантехника", name: "Установка смесителя", unit: "шт.", price: 2200 },
  { id: "c-sn3", section: "Сантехника", name: "Замена стояка ХВС/ГВС", unit: "м.п.", price: 3800 },
  { id: "c-sn4", section: "Сантехника", name: "Установка ванны", unit: "шт.", price: 7800 },

  { id: "c-sh1", section: "Штробление", name: "Штробление стены под кабель", unit: "м.п.", price: 320 },
  { id: "c-sh2", section: "Штробление", name: "Штробление под трубы канализации", unit: "м.п.", price: 580 },
  { id: "c-sh3", section: "Штробление", name: "Штробление подрозетников", unit: "шт.", price: 280 },

  { id: "c-el1", section: "Электрика", name: "Монтаж подрозетника", unit: "шт.", price: 380 },
  { id: "c-el2", section: "Электрика", name: "Прокладка кабеля ВВГ", unit: "м.п.", price: 95 },
  { id: "c-el3", section: "Электрика", name: "Установка розетки/выключателя", unit: "шт.", price: 350 },
  { id: "c-el4", section: "Электрика", name: "Сборка электрощита", unit: "шт.", price: 8500 },

  { id: "c-cl1", section: "Столярные работы", name: "Установка межкомнатной двери", unit: "шт.", price: 4800 },
  { id: "c-cl2", section: "Столярные работы", name: "Монтаж плинтуса", unit: "м.п.", price: 220 },
  { id: "c-cl3", section: "Столярные работы", name: "Монтаж наличников", unit: "м.п.", price: 280 },

  { id: "c-pw1", section: "Пластиковые окна", name: "Монтаж окна ПВХ 2-камерное", unit: "шт.", price: 9800 },
  { id: "c-pw2", section: "Пластиковые окна", name: "Установка подоконника", unit: "м.п.", price: 1200 },
  { id: "c-pw3", section: "Пластиковые окна", name: "Откосы из сэндвич-панели", unit: "м.п.", price: 1450 },

  { id: "c-sm1", section: "Спецмонтаж", name: "Монтаж кондиционера (внутр./внеш. блок)", unit: "шт.", price: 12500 },
  { id: "c-sm2", section: "Спецмонтаж", name: "Установка вентиляционной системы", unit: "м.п.", price: 1850 },
  { id: "c-sm3", section: "Спецмонтаж", name: "Сборка системы «Умный дом»", unit: "шт.", price: 22000 },

  { id: "c-ot1", section: "Прочее", name: "Защита поверхностей плёнкой", unit: "м²", price: 95 },
  { id: "c-ot2", section: "Прочее", name: "Финальная уборка помещения", unit: "м²", price: 180 },
  { id: "c-ot3", section: "Прочее", name: "Доставка материалов", unit: "рейс", price: 2500 },
];

export const sumEstimate = (e: Estimate) => e.items.reduce((s, i) => s + i.price * i.qty, 0);
export const sumEstimateAfterDiscount = (e: Estimate) => {
  const total = sumEstimate(e);
  return Math.round(total * (1 - (e.discount || 0) / 100));
};

export const INITIAL_ESTIMATES: Estimate[] = [
  {
    id: "e1", number: "СМ-2026-014", objectId: "obj-1", status: "Согласована",
    customer: "Семья Морозовых", manager: "Кристина", discount: 0, updated: "18.05.2026",
    items: [
      { id: "i-e1-1", section: "Демонтаж", name: "Демонтаж перегородок из кирпича", unit: "м²", price: 650, qty: 42 },
      { id: "i-e1-2", section: "Полы", name: "Цементно-песчаная стяжка", unit: "м²", price: 720, qty: 120 },
      { id: "i-e1-3", section: "Электрика", name: "Прокладка кабеля ВВГ", unit: "м.п.", price: 95, qty: 380 },
      { id: "i-e1-4", section: "Стены", name: "Штукатурка стен по маякам", unit: "м²", price: 780, qty: 220 },
    ],
  },
  {
    id: "e2", number: "СМ-2026-018", objectId: "obj-2", status: "Согласована",
    customer: "ООО «Эверест»", manager: "Кристина", discount: 5, updated: "12.05.2026",
    items: [
      { id: "i-e2-1", section: "Демонтаж", name: "Демонтаж напольной плитки", unit: "м²", price: 380, qty: 65 },
      { id: "i-e2-2", section: "Сантехника", name: "Замена стояка ХВС/ГВС", unit: "м.п.", price: 3800, qty: 12 },
      { id: "i-e2-3", section: "Потолки", name: "Монтаж натяжного потолка", unit: "м²", price: 850, qty: 88 },
    ],
  },
  {
    id: "e3", number: "СМ-2026-021", objectId: "obj-3", status: "На согласовании",
    customer: "Иванов А. С.", manager: "Кристина", discount: 0, updated: "16.05.2026",
    items: [
      { id: "i-e3-1", section: "Стены", name: "Поклейка обоев", unit: "м²", price: 380, qty: 145 },
      { id: "i-e3-2", section: "Полы", name: "Укладка ламината", unit: "м²", price: 480, qty: 78 },
    ],
  },
  {
    id: "e4", number: "СМ-2026-022", objectId: "obj-4", status: "Черновик",
    customer: "Петрова Е. В.", manager: "Кристина", discount: 0, updated: "17.05.2026",
    items: [
      { id: "i-e4-1", section: "Демонтаж", name: "Демонтаж перегородок из кирпича", unit: "м²", price: 650, qty: 28 },
    ],
  },
  {
    id: "e5", number: "СМ-2026-009", objectId: "obj-5", status: "Согласована",
    customer: "Соколов Д. М.", manager: "Александр Кузьмин", discount: 3, updated: "02.05.2026",
    items: [
      { id: "i-e5-1", section: "Стены", name: "Шпатлёвка стен под покраску", unit: "м²", price: 520, qty: 180 },
      { id: "i-e5-2", section: "Столярные работы", name: "Установка межкомнатной двери", unit: "шт.", price: 4800, qty: 6 },
    ],
  },
  {
    id: "e7", number: "СМ-2026-025", objectId: "obj-7", status: "Согласована",
    customer: "Александр", manager: "Кристина", discount: 5, updated: "Сегодня",
    items: [
      { id: "i-e7-1", section: "Демонтаж", name: "Демонтаж старой стяжки", unit: "м²", price: 420, qty: 86 },
      { id: "i-e7-2", section: "Штробление", name: "Штробление стены под кабель", unit: "м.п.", price: 320, qty: 145 },
      { id: "i-e7-3", section: "Электрика", name: "Монтаж подрозетника", unit: "шт.", price: 380, qty: 42 },
      { id: "i-e7-4", section: "Стены", name: "Штукатурка стен по маякам", unit: "м²", price: 780, qty: 210 },
      { id: "i-e7-5", section: "Потолки", name: "Шпатлёвка потолка под покраску", unit: "м²", price: 540, qty: 86 },
      { id: "i-e7-6", section: "Сантехника", name: "Установка унитаза", unit: "шт.", price: 4500, qty: 2 },
      { id: "i-e7-7", section: "Полы", name: "Цементно-песчаная стяжка", unit: "м²", price: 720, qty: 86 },
      { id: "i-e7-8", section: "Пластиковые окна", name: "Монтаж окна ПВХ 2-камерное", unit: "шт.", price: 9800, qty: 5 },
      { id: "i-e7-9", section: "Спецмонтаж", name: "Монтаж кондиционера (внутр./внеш. блок)", unit: "шт.", price: 12500, qty: 2 },
    ],
  },
];

export type ToolStatus = "Свободен" | "На объекте" | "В ремонте" | "Потерян" | "Списан";
export type ToolCondition = "Рабочее" | "Требует проверки" | "Повреждено" | "Неисправно";

export const TOOL_CATEGORIES = [
  "Электроинструмент",
  "Измерительный инструмент",
  "Уборочная техника",
  "Лестницы и стремянки",
  "Прочее",
] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  serial: string;
  status: ToolStatus;
  objectId?: string;
  location: string;
  issuedTo: string;
  condition: ToolCondition;
  issuedDate: string;
  plannedReturn: string;
  comment: string;
}

export const INITIAL_TOOLS: Tool[] = [
  {
    id: "tl-p1", name: "Перфоратор Makita HR2470", category: "Электроинструмент", serial: "MK-2470",
    status: "На объекте", objectId: "obj-7", location: "Купчино, Пеники 24",
    issuedTo: "Бригада №1", condition: "Рабочее",
    issuedDate: "18.05.2026", plannedReturn: "30.06.2026", comment: "—",
  },
  {
    id: "tl-p2", name: "Штроборез Bosch GNF 35", category: "Электроинструмент", serial: "BSH-3501",
    status: "На объекте", objectId: "obj-7", location: "Купчино, Пеники 24",
    issuedTo: "Бригада №1", condition: "Рабочее",
    issuedDate: "19.05.2026", plannedReturn: "15.06.2026", comment: "Под штробление электрики",
  },
  {
    id: "tl-p3", name: "Строительный пылесос Bosch GAS", category: "Уборочная техника", serial: "BSH-GAS20",
    status: "На объекте", objectId: "obj-7", location: "Купчино, Пеники 24",
    issuedTo: "Виктор Петрович", condition: "Требует проверки",
    issuedDate: "18.05.2026", plannedReturn: "30.06.2026", comment: "Проверить фильтр после демонтажа",
  },
  {
    id: "tl1", name: "Перфоратор Bosch GBH 2-28", category: "Электроинструмент", serial: "BSH-2841",
    status: "На объекте", objectId: "obj-2", location: "Грибоедова 80",
    issuedTo: "Виктор Петрович", condition: "Рабочее",
    issuedDate: "12.05.2026", plannedReturn: "30.06.2026", comment: "—",
  },
  {
    id: "tl2", name: "Шуруповёрт Makita DDF485", category: "Электроинструмент", serial: "MK-4851",
    status: "На объекте", objectId: "obj-1", location: "Репинские усадьбы",
    issuedTo: "Бригада №1", condition: "Требует проверки",
    issuedDate: "08.05.2026", plannedReturn: "20.06.2026", comment: "Просел аккумулятор, нужна замена",
  },
  {
    id: "tl3", name: "Лазерный уровень BOSCH GLL", category: "Измерительный инструмент", serial: "GLL-3X",
    status: "Свободен", location: "Склад",
    issuedTo: "—", condition: "Рабочее",
    issuedDate: "—", plannedReturn: "—", comment: "—",
  },
  {
    id: "tl4", name: "Строительный пылесос Karcher", category: "Уборочная техника", serial: "KR-1100",
    status: "В ремонте", location: "Сервис «Инструмент-Сервис»",
    issuedTo: "—", condition: "Неисправно",
    issuedDate: "15.05.2026", plannedReturn: "28.05.2026", comment: "Замена мотора",
  },
  {
    id: "tl5", name: "Болгарка DeWalt DWE", category: "Электроинструмент", serial: "DW-8125",
    status: "На объекте", objectId: "obj-7", location: "Купчино, Пеники 24",
    issuedTo: "Бригада №2", condition: "Рабочее",
    issuedDate: "16.05.2026", plannedReturn: "15.07.2026", comment: "—",
  },
  {
    id: "tl6", name: "Лестница алюминиевая 4×4", category: "Лестницы и стремянки", serial: "ALM-44",
    status: "На объекте", objectId: "obj-3", location: "Энгельса 29",
    issuedTo: "Виктор Петрович", condition: "Рабочее",
    issuedDate: "10.05.2026", plannedReturn: "10.08.2026", comment: "—",
  },
  {
    id: "tl7", name: "Сварочный аппарат Ресанта", category: "Электроинструмент", serial: "RS-2202",
    status: "Свободен", location: "Склад",
    issuedTo: "—", condition: "Рабочее",
    issuedDate: "—", plannedReturn: "—", comment: "—",
  },
  {
    id: "tl8", name: "Лобзик Bosch GST 90", category: "Электроинструмент", serial: "BSH-9001",
    status: "На объекте", objectId: "obj-2", location: "Грибоедова 80",
    issuedTo: "Бригада №2", condition: "Повреждено",
    issuedDate: "14.05.2026", plannedReturn: "30.06.2026", comment: "Скол на корпусе",
  },
];

export interface Document {
  id: string;
  name: string;
  type: "Договор" | "Акт" | "Счет" | "Чертеж" | "Прочее";
  objectId: string;
  uploaded: string;
  author: string;
}

export const DOCUMENTS: Document[] = [
  { id: "d1", name: "Договор подряда №241.pdf", type: "Договор", objectId: "obj-1", uploaded: "01.04.2026", author: "Кристина" },
  { id: "d2", name: "Акт скрытых работ.pdf", type: "Акт", objectId: "obj-1", uploaded: "10.05.2026", author: "Виктор Петрович" },
  { id: "d3", name: "Счет №118.pdf", type: "Счет", objectId: "obj-2", uploaded: "12.05.2026", author: "Кристина" },
  { id: "d4", name: "Чертеж планировки.pdf", type: "Чертеж", objectId: "obj-3", uploaded: "08.05.2026", author: "Александр Кузьмин" },
  { id: "d5", name: "Договор подряда №238.pdf", type: "Договор", objectId: "obj-5", uploaded: "20.03.2026", author: "Кристина" },
  { id: "d6", name: "Акт выполненных работ.pdf", type: "Акт", objectId: "obj-6", uploaded: "10.04.2026", author: "Виктор Петрович" },
];

export interface ObjectComment {
  id: string;
  objectId: string;
  author: string;
  text: string;
  date: string;
}

export const INITIAL_OBJECT_COMMENTS: ObjectComment[] = [
  { id: "oc-p1", objectId: "obj-7", author: "Кристина", text: "Заказчик Александр согласовал смету и аванс. Стартуем по графику.", date: "Вчера, 11:15" },
  { id: "oc-p2", objectId: "obj-7", author: "Виктор Петрович", text: "Бригада №1 вышла на объект, начинаем с демонтажа стяжки и штробления.", date: "Сегодня, 09:00" },
  { id: "oc-p3", objectId: "obj-7", author: "Александр Кузьмин", text: "Поставил объект на контроль. Жду фотоотчёт по итогам дня.", date: "Сегодня, 10:30" },
  { id: "oc1", objectId: "obj-1", author: "Александр Кузьмин", text: "Подняли вопрос по срокам — нужен ещё один человек на стяжку.", date: "Сегодня, 09:10" },
  { id: "oc2", objectId: "obj-1", author: "Виктор Петрович", text: "Согласовал с бригадой, выходит ещё двое с завтра.", date: "Сегодня, 09:42" },
  { id: "oc3", objectId: "obj-2", author: "Кристина", text: "Заказчик попросил передвинуть розетки в кухне.", date: "Вчера, 17:20" },
  { id: "oc4", objectId: "obj-5", author: "Виктор Петрович", text: "По чистовой нужно дополнительно согласовать цвет затирки.", date: "Вчера, 14:00" },
];

export const EMPLOYEES = [
  "Александр Кузьмин",
  "Кристина",
  "Виктор Петрович",
  "Бригада №1",
  "Бригада №2",
  "Ответственный за инструмент",
];

// Объекты, закреплённые за «Мастером» в демо
export const FOREMAN_NAME = "Виктор Петрович";
export const FOREMAN_BRIGADES = ["Бригада №1", "Бригада №2", FOREMAN_NAME];

export const formatMoney = (n: number) =>
  n.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });

export const objectName = (id: string) => OBJECTS.find((o) => o.id === id)?.name ?? "—";
export const objectById = (id: string) => OBJECTS.find((o) => o.id === id);