export type PjjScheduleSlot = {
  rombel_id: string | null;
  mata_pelajaran_id: string | null;
  jam_list: number[];
  is_kelompok: boolean;
};

export function pjjClassSlots<T extends PjjScheduleSlot>(slots: T[]): T[] {
  return slots.filter(slot => !slot.is_kelompok && !!slot.rombel_id && !!slot.mata_pelajaran_id);
}

export function matchesPjjSchedule(slots: PjjScheduleSlot[], rombelId: string, mapelId: string, jam: number[]): boolean {
  return jam.length > 0 && pjjClassSlots(slots).some(slot => slot.rombel_id === rombelId && slot.mata_pelajaran_id === mapelId && jam.every(period => slot.jam_list.includes(period)));
}