import { NextResponse } from 'next/server'
import { getCollections, getTemplates } from '@/lib/crossmint'

export async function GET() {
    try {
        if (!process.env.CROSSMINT_API_KEY) {
            return NextResponse.json({ error: 'CROSSMINT_API_KEY not set' }, { status: 500 })
        }

        const responseData = await getCollections()

        // Crossmint API might return an array directly, or { results: [] }
        const collections = Array.isArray(responseData)
            ? responseData
            : (responseData.results || responseData.data || [])

        if (!Array.isArray(collections)) {
            console.error('Crossmint collections response is not an array:', responseData)
            return NextResponse.json([])
        }

        const allTemplates = []

        for (const collection of collections) {
            if (!collection.id) continue;

            const templatesData = await getTemplates(collection.id)

            // Handle various possible response formats for templates
            const templates = Array.isArray(templatesData)
                ? templatesData
                : (templatesData.results || templatesData.data || (templatesData.templateId ? [templatesData] : []))

            if (Array.isArray(templates)) {
                allTemplates.push(...templates.map((t: any) => ({
                    id: `${collection.id}:${t.templateId || t.id}`, // Use composite ID
                    name: t.metadata?.name || t.name || t.templateId || t.id,
                    collectionName: collection.metadata?.name || collection.title || collection.id
                })))
            }
        }

        return NextResponse.json(allTemplates)
    } catch (error: any) {
        console.error('Error fetching Crossmint templates:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
