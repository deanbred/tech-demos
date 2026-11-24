/** Prompts and paths copied from the gemini-api README examples. */
export const PROMPTS = {
  video: 'List the key action items with timestamps',
  ocr: 'Extract all visible text, preserving structure.',
  tts: "Welcome. Let's build something together.",
  image: 'A friendly robot mascot, soft studio lighting',
} as const

export const SAMPLE_INPUTS = {
  video: 'interview.mp4',
  image: 'brief.png',
  pdf: 'product-brief.pdf',
} as const

export const OUTPUTS = {
  transcribe: 'interview.srt',
  tts: './assets/welcome.wav',
  image: './assets/mascot.jpg',
} as const

export const TABS = ['video', 'document', 'tts', 'image'] as const
export type TabId = (typeof TABS)[number]

export function isTabId(value: string): value is TabId {
  return (TABS as readonly string[]).includes(value)
}
