'use client'

import { useState, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface GeoGuessUploaderProps {
  currentUrl?: string
  onUpload: (url: string) => void
}

export function GeoGuessUploader({ currentUrl, onUpload }: GeoGuessUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview locale
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)

    // Upload vers Supabase Storage
    setUploading(true)
    const supabase = getSupabaseClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage.from('geo-images').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

    if (error) {
      alert(`Erreur upload : ${error.message}`)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('geo-images').getPublicUrl(path)
    onUpload(urlData.publicUrl)
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold text-fiesta-dark/80">Image GeoGuess</label>

      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="w-full max-w-xs rounded-xl object-cover aspect-video border-2 border-gray-200"
        />
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="bg-blue-500 text-white font-bold rounded-xl px-4 py-2 text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {uploading ? 'Upload en cours...' : preview ? 'Changer l&apos;image' : 'Choisir une image'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
