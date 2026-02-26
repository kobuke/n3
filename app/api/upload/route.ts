import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Get file extension and create unique filename
        const ext = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const supabase = createAdminClient()

        // Ensure bucket exists or use an existing one
        // Note: For this to work, a public bucket named 'nft-images' must be created in Supabase
        const { data, error } = await supabase.storage
            .from('nft-images')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false
            })

        if (error) {
            console.error("Storage upload error:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('nft-images')
            .getPublicUrl(fileName)

        return NextResponse.json({ url: publicUrlData.publicUrl })
    } catch (error: any) {
        console.error("Upload handler error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
