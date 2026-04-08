import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://10.20.0.10:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const command = body.command

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Missing command' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')

    const resp = await fetch(`${API_URL}/api/llm/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        prompt: command,
        context: { source: 'portal-command-bar' },
      }),
    })

    if (resp.ok) {
      const data = await resp.json()
      return NextResponse.json({ response: data.response, backend: data.backend })
    }

    // LLM endpoint returned non-OK — surface the error to the caller
    const errBody = await resp.json().catch(() => ({ detail: resp.statusText }))
    return NextResponse.json(
      { error: errBody.detail || `LLM error: ${resp.status}` },
      { status: resp.status }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
