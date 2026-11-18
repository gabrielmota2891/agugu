// Hitos predefinidos, ordenados por la edad típica (meses) en que suelen ocurrir.
// La edad es solo orientativa: cada bebé lleva su propio ritmo.
export const MILESTONES = [
  { id: 'nacimiento', icon: '🍼', title: 'Nacimiento', typical: 0 },
  { id: 'casa', icon: '🏠', title: 'Llegada a casa', typical: 0 },
  { id: 'primer-bano', icon: '🛁', title: 'Primer baño', typical: 0 },
  { id: 'sonrisa', icon: '😊', title: 'Primera sonrisa', typical: 2 },
  { id: 'cabeza', icon: '💪', title: 'Sostiene la cabeza', typical: 3 },
  { id: 'risa', icon: '😆', title: 'Primera carcajada', typical: 4 },
  { id: 'voltea', icon: '🔄', title: 'Se da la vuelta', typical: 5 },
  { id: 'solidos', icon: '🥕', title: 'Primera comida sólida', typical: 6 },
  { id: 'sentado', icon: '🪑', title: 'Se sienta sin ayuda', typical: 7 },
  { id: 'diente', icon: '🦷', title: 'Primer diente', typical: 7 },
  { id: 'gatea', icon: '🐛', title: 'Gatea', typical: 9 },
  { id: 'de-pie', icon: '🧍', title: 'Se pone de pie', typical: 10 },
  { id: 'adios', icon: '👋', title: 'Dice adiós con la mano', typical: 10 },
  { id: 'palabra', icon: '🗣️', title: 'Primera palabra', typical: 12 },
  { id: 'pasos', icon: '👣', title: 'Primeros pasos', typical: 12 },
  { id: 'cumple-1', icon: '🎂', title: 'Primer cumpleaños', typical: 12 },
  { id: 'pelo', icon: '✂️', title: 'Primer corte de pelo', typical: 14 },
  { id: 'duerme', icon: '🌙', title: 'Duerme toda la noche', typical: 6 },
  { id: 'viaje', icon: '✈️', title: 'Primer viaje', typical: 6 },
  { id: 'cuchara', icon: '🥄', title: 'Come solo con cuchara', typical: 18 },
  { id: 'frase', icon: '💬', title: 'Primera frase', typical: 24 },
  { id: 'panal', icon: '🚽', title: 'Deja el pañal', typical: 30 },
].sort((a, b) => a.typical - b.typical);

export const milestoneById = (id) => MILESTONES.find((m) => m.id === id);
