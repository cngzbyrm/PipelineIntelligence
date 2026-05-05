import { useState, useEffect } from 'react'
import {
    SlidersHorizontal, Brain, Vault, Bell, ArrowClockwise,
    CheckCircle, FloppyDisk, Trash
} from '@phosphor-icons/react'
import { useStore } from '../store'
import { dashboardApi } from '../services/api'
import { toast } from '../components/ui'
import type { AiAnalysis } from '../types'
import Select from '../components/ui/Select'
import PageHeader from '../components/layout/PageHeader'

export default function SettingsPage() {
    const { refreshInterval, sound, autoAI, flakyDetect,
        setRefreshInterval, toggleSound, setAutoAI, setFlakyDetect } = useStore()

    // Jenkins
    const [jUrl, setJUrl] = useState('')
    const [jUser, setJUser] = useState('')
    const [jToken, setJToken] = useState('')

    // AI
    const [aiKey, setAiKey] = useState('')
    const [aiMod, setAiMod] = useState('claude-haiku-4-5-20251001')

    // Nexus
    const [nUrl, setNUrl] = useState('')
    const [nUser, setNUser] = useState('')
    const [nPass, setNPass] = useState('')

    // Memory
    const [memory, setMemory] = useState<AiAnalysis[]>([])
    const [saving, setSaving] = useState<string | null>(null)
    const [lastSave, setLastSave] = useState<Record<string, string>>({})

    useEffect(() => {
        // Load all settings from DB
        dashboardApi.getAllSettings().then(res => {
            const s: Record<string, string> = {}
            res.data.forEach((x: any) => { s[x.key] = x.value })
            setJUrl(s['jenkins.url'] || '')
            setJUser(s['jenkins.user'] || '')
            setJToken(s['jenkins.token'] !== '***' ? s['jenkins.token'] || '' : '')
            setAiKey(s['ai.apikey'] !== '***' ? s['ai.apikey'] || '' : '')
            setAiMod(s['ai.model'] || 'claude-haiku-4-5-20251001')
            setNUrl(s['nexus.url'] || '')
            setNUser(s['nexus.user'] || '')
            setNPass(s['nexus.password'] !== '***' ? s['nexus.password'] || '' : '')
        }).catch(() => { })

        dashboardApi.getAiMemory().then(r => setMemory(r.data)).catch(() => { })
    }, [])

    async function save(group: string, values: Record<string, string>) {
        setSaving(group)
        try {
            await dashboardApi.saveAllSettings(values, group)
            setLastSave(p => ({ ...p, [group]: new Date().toLocaleTimeString('tr-TR') }))
            toast(`${group} ayarları kaydedildi`, 'var(--g)')
        } catch { toast('Kaydetme başarısız', 'var(--r)') }
        finally { setSaving(null) }
    }

    async function clearMemory() {
        await dashboardApi.clearMemory()
        setMemory([])
        toast('AI hafızası temizlendi')
    }

    const SaveBtn = ({ group }: { group: string }) => (
        <button className="btn btn-p" onClick={() => {
            if (group === 'jenkins') save('jenkins', { 'jenkins.url': jUrl, 'jenkins.user': jUser, 'jenkins.token': jToken })
            else if (group === 'ai') save('ai', { 'ai.apikey': aiKey, 'ai.model': aiMod })
            else if (group === 'nexus') save('nexus', { 'nexus.url': nUrl, 'nexus.user': nUser, 'nexus.password': nPass })
        }} disabled={saving === group}>
            {saving === group
                ? <><ArrowClockwise size={13} style={{ animation: 'rot .7s linear infinite' }} /> Kaydediliyor...</>
                : <><FloppyDisk size={13} weight="bold" /> Kaydet</>}
        </button>
    )

    return (
        <div className="page-wrap">
            <PageHeader
                icon={<SlidersHorizontal size={22} weight="duotone" />}
                kicker="Yapılandırma"
                title="Ayarlar"
                subtitle="Tüm ayarlar veritabanına kaydedilir — uygulama yeniden başlatılsa bile korunur."
            />

            <div className="sgrid">

                {/* Jenkins */}
                <div className="card">
                    <div className="ch" style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy3))' }}>
                        <div className="ct" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
                            <SlidersHorizontal size={15} weight="duotone" color="var(--teal-light)" /> Jenkins Bağlantısı
                        </div>
                        {lastSave['jenkins'] && (
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={10} weight="fill" color="var(--teal-light)" /> {lastSave['jenkins']}
                            </div>
                        )}
                    </div>
                    <div className="fbody">
                        <div className="fg">
                            <label className="fl">Jenkins URL</label>
                            <input className="fi" value={jUrl} onChange={e => setJUrl(e.target.value)} placeholder="http://jenkins:8080" />
                        </div>
                        <div className="fg">
                            <label className="fl">Kullanıcı Adı</label>
                            <input className="fi" value={jUser} onChange={e => setJUser(e.target.value)} placeholder="admin" />
                        </div>
                        <div className="fg">
                            <label className="fl">API Token</label>
                            <input className="fi" type="password" value={jToken} onChange={e => setJToken(e.target.value)} placeholder="Jenkins → Kullanıcı → API Token" />
                            <div className="fh">Jenkins'te: Kullanıcı adı → Configure → API Token → Generate</div>
                        </div>
                        <SaveBtn group="jenkins" />
                    </div>
                </div>

                {/* AI */}
                <div className="card">
                    <div className="ch" style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy3))' }}>
                        <div className="ct" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Brain size={15} weight="duotone" color="var(--teal-light)" /> Claude AI
                        </div>
                        {lastSave['ai'] && (
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={10} weight="fill" color="var(--teal-light)" /> {lastSave['ai']}
                            </div>
                        )}
                    </div>
                    <div className="fbody">
                        <div className="fg">
                            <label className="fl">Anthropic API Key</label>
                            <input className="fi" type="password" value={aiKey} onChange={e => setAiKey(e.target.value)} placeholder="sk-ant-..." />
                            <div className="fh">console.anthropic.com → API Keys → Create Key</div>
                        </div>
                        <div className="fg">
                            <label className="fl">Model</label>
                            <select className="fi" value={aiMod} onChange={e => setAiMod(e.target.value)}>
                                <option value="claude-haiku-4-5-20251001">Haiku (Hızlı & Ucuz) — Önerilen</option>
                                <option value="claude-sonnet-4-6">Sonnet (Derin Analiz — 5× pahalı)</option>
                            </select>
                        </div>
                        <SaveBtn group="ai" />
                    </div>
                </div>

                {/* Nexus */}
                <div className="card">
                    <div className="ch" style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy3))' }}>
                        <div className="ct" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Vault size={15} weight="duotone" color="var(--teal-light)" /> Nexus Bağlantısı
                        </div>
                        {lastSave['nexus'] && (
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={10} weight="fill" color="var(--teal-light)" /> {lastSave['nexus']}
                            </div>
                        )}
                    </div>
                    <div className="fbody">
                        <div className="fg">
                            <label className="fl">Nexus URL</label>
                            <input className="fi" value={nUrl} onChange={e => setNUrl(e.target.value)} placeholder="http://nexus:8081" />
                        </div>
                        <div className="fg">
                            <label className="fl">Kullanıcı Adı</label>
                            <input className="fi" value={nUser} onChange={e => setNUser(e.target.value)} placeholder="admin" />
                        </div>
                        <div className="fg">
                            <label className="fl">Şifre</label>
                            <input className="fi" type="password" value={nPass} onChange={e => setNPass(e.target.value)} placeholder="Nexus şifresi" />
                        </div>
                        <SaveBtn group="nexus" />
                    </div>
                </div>

                {/* Notifications */}
                <div className="card">
                    <div className="ch" style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy3))' }}>
                        <div className="ct" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Bell size={15} weight="duotone" color="var(--teal-light)" /> Bildirimler & Tercihler
                        </div>
                    </div>
                    <div className="fbody">
                        {[
                            { label: 'Tarayıcı sesi', sub: 'Build kırılınca ses çal', val: sound, fn: toggleSound },
                            { label: 'Flaky uyarısı', sub: 'Tekrar eden hataları vurgula', val: flakyDetect, fn: () => setFlakyDetect(!flakyDetect) },
                            { label: 'Otomatik AI analizi', sub: 'Hata olunca Claude\'a otomatik gönder', val: autoAI, fn: () => setAutoAI(!autoAI) },
                        ].map(item => (
                            <div key={item.label} className="tg-row">
                                <div>
                                    <div className="tg-l">{item.label}</div>
                                    <div className="tg-s">{item.sub}</div>
                                </div>
                                <label className="tg">
                                    <input type="checkbox" checked={item.val} onChange={item.fn} />
                                    <span className="tgs" />
                                </label>
                            </div>
                        ))}
                        <div className="tg-row">
                            <div>
                                <div className="tg-l">Yenileme Aralığı</div>
                                <div className="tg-s">Otomatik güncelleme sıklığı</div>
                            </div>
                            <Select
                                value={String(refreshInterval)}
                                onChange={v => setRefreshInterval(parseInt(v))}
                                options={[
                                    { value: '15', label: '15 sn' },
                                    { value: '30', label: '30 sn' },
                                    { value: '60', label: '1 dk' },
                                    { value: '300', label: '5 dk' },
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* AI Memory */}
                <div className="card full">
                    <div className="ch" style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy3))' }}>
                        <div className="ct" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Brain size={15} weight="duotone" color="var(--teal-light)" /> AI Hafızası
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{memory.length} kayıt</div>
                    </div>
                    <div className="fbody">
                        <p style={{ fontSize: 13, color: 'var(--mt)', marginBottom: 14 }}>
                            Claude aynı hataları hatırlar. Aynı proje aynı hatayla geldiğinde "Bu hatayı biliyorum" der ve çözümü doğrudan gösterir.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, marginBottom: 14 }}>
                            {memory.slice(0, 9).map(m => (
                                <div key={`${m.job}:${m.buildId}`} style={{
                                    padding: '10px 12px', background: 'var(--sur2)', borderRadius: 8,
                                    borderLeft: '3px solid var(--teal)', fontSize: 11,
                                }}>
                                    <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 3 }}>
                                        {m.job} <span style={{ color: 'var(--mt)' }}>#{m.buildId}</span>
                                    </div>
                                    <div style={{ color: 'var(--mt)', fontFamily: 'DM Mono,monospace', fontSize: 10 }}>
                                        {m.hata?.substring(0, 70)}{m.hata?.length > 70 ? '...' : ''}
                                    </div>
                                </div>
                            ))}
                            {memory.length === 0 && (
                                <div style={{ color: 'var(--mt)', fontSize: 12 }}>Hafıza boş — başarısız build analiz edilince dolmaya başlar.</div>
                            )}
                        </div>
                        <button className="btn btn-danger" onClick={clearMemory} disabled={memory.length === 0}>
                            <Trash size={13} weight="bold" /> Hafızayı Temizle
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
