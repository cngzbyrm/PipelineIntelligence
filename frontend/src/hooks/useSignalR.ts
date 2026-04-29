import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { useStore } from '../store'
import type { BuildResult } from '../types'

export function useSignalR() {
  const { setBuilds, sound } = useStore()
  const connRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/builds')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None) // konsol gürültüsünü kapat
      .build()

    // Backend'deki hub metod adlarıyla birebir eşleş (büyük/küçük harf önemli)
    conn.on('BuildsUpdated', (builds: BuildResult[]) => {
      setBuilds(builds)
    })

    conn.on('NewFailures', (fails: BuildResult[]) => {
      if (sound && fails.length > 0) playBeep()
    })

    // Bağlantı hatası sessizce geçilsin — polling zaten veriyi çekiyor
    conn.start().catch(() => {})
    connRef.current = conn

    return () => { conn.stop() }
  }, []) // eslint-disable-line

  return connRef
}

function playBeep() {
  try {
    const ctx  = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 440
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {}
}