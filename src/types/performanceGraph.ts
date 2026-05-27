export type PerformanceGraphSeries = {
  cadet: number[];
  courseAverage: number[];
  cadetTermPresence: boolean[];
  maxMarks?: number[];
};

export type PerformanceGraphStats = {
  highest: number;
  average: number;
  lowest: number;
};

export type PerformanceGraphData = {
  academics: PerformanceGraphSeries;
  olq: PerformanceGraphSeries;
  odt: PerformanceGraphSeries;
  discipline: PerformanceGraphSeries;
  medical: PerformanceGraphSeries;
};

const EMPTY_SERIES: PerformanceGraphSeries = {
  cadet: [0, 0, 0, 0, 0, 0],
  courseAverage: [0, 0, 0, 0, 0, 0],
  cadetTermPresence: [false, false, false, false, false, false],
  maxMarks: [0, 0, 0, 0, 0, 0],
};

export const EMPTY_PERFORMANCE_GRAPH_DATA: PerformanceGraphData = {
  academics: {
    ...EMPTY_SERIES,
    cadet: [...EMPTY_SERIES.cadet],
    courseAverage: [...EMPTY_SERIES.courseAverage],
    cadetTermPresence: [...EMPTY_SERIES.cadetTermPresence],
    maxMarks: [...(EMPTY_SERIES.maxMarks ?? [])],
  },
  olq: {
    ...EMPTY_SERIES,
    cadet: [...EMPTY_SERIES.cadet],
    courseAverage: [...EMPTY_SERIES.courseAverage],
    cadetTermPresence: [...EMPTY_SERIES.cadetTermPresence],
    maxMarks: [...(EMPTY_SERIES.maxMarks ?? [])],
  },
  odt: {
    ...EMPTY_SERIES,
    cadet: [...EMPTY_SERIES.cadet],
    courseAverage: [...EMPTY_SERIES.courseAverage],
    cadetTermPresence: [...EMPTY_SERIES.cadetTermPresence],
    maxMarks: [...(EMPTY_SERIES.maxMarks ?? [])],
  },
  discipline: {
    ...EMPTY_SERIES,
    cadet: [...EMPTY_SERIES.cadet],
    courseAverage: [...EMPTY_SERIES.courseAverage],
    cadetTermPresence: [...EMPTY_SERIES.cadetTermPresence],
    maxMarks: [...(EMPTY_SERIES.maxMarks ?? [])],
  },
  medical: {
    ...EMPTY_SERIES,
    cadet: [...EMPTY_SERIES.cadet],
    courseAverage: [...EMPTY_SERIES.courseAverage],
    cadetTermPresence: [...EMPTY_SERIES.cadetTermPresence],
    maxMarks: [...(EMPTY_SERIES.maxMarks ?? [])],
  },
};
