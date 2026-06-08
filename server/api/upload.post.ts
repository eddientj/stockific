const BUCKET = 'product-images'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const file = formData?.find(f => f.name === 'file')

  if (!file?.data) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type ?? '')) {
    throw createError({ statusCode: 400, statusMessage: 'Only JPEG, PNG, WebP and GIF are allowed' })
  }

  if (file.data.length > 5 * 1024 * 1024) {
    throw createError({ statusCode: 400, statusMessage: 'File must be under 5 MB' })
  }

  const ext      = (file.filename ?? 'image').split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const supabase = useSupabaseAdmin()

  // Create the bucket if it doesn't exist yet
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file.data, {
      contentType: file.type ?? 'image/jpeg',
      upsert: false,
    })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

  return { url: publicUrl }
})
