import { Robot, MagnifyingGlass, Brain } from '@phosphor-icons/react'
import { useStore } from '../../store'
import { Spinner } from '../ui'

export default function AiPanel() {
  const { currentAnalysis, aiLoading } = useStore()

  return (
    <div className="aip">
      <div className="aiph">
        <div className="aibox">
          <Brain size={16} weight="duotone" color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>Claude AI Analizi</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>Hata hafızası aktif</div>
        </div>
      </div>
      <div className="aipb">
        {aiLoading ? (
          <div className="spin-wrap">
            <Spinner size={26} />
            <div className="spint">Claude analiz ediyor...</div>
          </div>
        ) : currentAnalysis ? (
          <div className="air">
            <div className="apr">
              <Robot size={10} weight="duotone" style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {currentAnalysis.job} · #{currentAnalysis.buildId}
            </div>
            <div className="ais">
              <div className="aisl le">❌ Hata</div>
              <div className="aisv">{currentAnalysis.hata}</div>
            </div>
            <div className="ais">
              <div className="aisl lc">📌 Sebep</div>
              <div className="aisv">{currentAnalysis.sebep}</div>
            </div>
            <div className="ais">
              <div className="aisl lf">✅ Çözüm</div>
              <div className="aisv">{currentAnalysis.cozum}</div>
            </div>
            <div className="ais">
              <div className="aisl lt">⏱ Tahmini Süre</div>
              <div className="aisv">{currentAnalysis.sure}</div>
            </div>
            {currentAnalysis.fromMemory && (
              <div className="amn">
                💾 Hafızadan geldi — yeniden analiz için tekrar tıklayın.
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <MagnifyingGlass size={32} weight="duotone" style={{ opacity: .4, marginBottom: 8 }} />
            <div>Başarısız bir build'in<br /><strong>Analiz</strong> butonuna tıklayın</div>
          </div>
        )}
      </div>
    </div>
  )
}
