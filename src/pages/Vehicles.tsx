import React, { useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { useLang } from '../i18n/LanguageContext'
import { vehiclesApi } from '../api/resources'
import { ApiError } from '../api/http'
import { DemoBadge } from '../components/ui/ApiState'
import { useAuth } from '../context/AuthContext'

const INITIAL_VEHICLES = [
  { id: 'V-001', plate: 'ABC-1234', vin: 'JN1AZ4EH2FM730001', make: 'Toyota', model: 'Camry', year: '2022', mileage: '42,500', customer: 'Mohammed Al-Rashid', status: 'active' as const, lastService: '12 Sep 2024', nextService: '12 Mar 2025' },
  { id: 'V-002', plate: 'XYZ-5678', vin: '1HGBH41JXMN109186', make: 'Honda', model: 'Accord', year: '2021', mileage: '68,200', customer: 'Sarah Al-Anazi', status: 'active' as const, lastService: '10 Sep 2024', nextService: '10 Mar 2025' },
  { id: 'V-003', plate: 'DEF-9012', vin: 'WBA5A5C51FD520715', make: 'BMW', model: '520i', year: '2023', mileage: '18,900', customer: 'Rayan Omar', status: 'active' as const, lastService: '5 Sep 2024', nextService: '5 Mar 2025' },
  { id: 'V-004', plate: 'GHI-3456', vin: 'KMHD84LF8KU101613', make: 'Hyundai', model: 'Tucson', year: '2022', mileage: '35,000', customer: 'Noura Al-Saud', status: 'active' as const, lastService: '1 Sep 2024', nextService: '1 Mar 2025' },
  { id: 'V-005', plate: 'JKL-7890', vin: '1FTEW1E81MKD92350', make: 'Ford', model: 'F-150', year: '2020', mileage: '89,100', customer: 'Omar Al-Harthi', status: 'inactive' as const, lastService: '28 Aug 2024', nextService: '28 Feb 2025' },
]

export default function Vehicles() {
  const { t } = useLang()
  const { mode } = useAuth()
  const [search, setSearch] = useState('')
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES)
  const [selected, setSelected] = useState<(typeof INITIAL_VEHICLES)[0] | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const make = String(fd.get('make') ?? '').trim()
    const model = String(fd.get('model') ?? '').trim()
    const year = Number(fd.get('year') ?? 0)
    const plate = String(fd.get('plate') ?? '').trim()
    const vin = String(fd.get('vin') ?? '').trim().toUpperCase() || 'UNKNOWNVIN00000000'.slice(0, 17)
    const mileage = Number(fd.get('mileage') ?? 0)
    const customerId = String(fd.get('customer') ?? '')
    setSaving(true)
    setSaveError('')
    try {
      // Contract: POST /vehicles (plate/VIN unique among active -> 409).
      await vehiclesApi.create({ customerId, plate, vin, make, model, year, mileage, mileageUnit: 'KM' })
      setAddOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo: keep working locally, clearly labeled.
        setVehicles((prev) => [...prev, {
          id: `V-LOCAL-${Date.now()}`, plate, vin, make, model,
          year: String(year), mileage: mileage.toLocaleString(), customer: 'Demo customer',
          status: 'active' as const, lastService: '—', nextService: '—',
        }])
        setAddOpen(false)
      } else {
        setSaveError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Registration failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const filtered = vehicles.filter(
    (v) =>
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.customer.toLowerCase().includes(search.toLowerCase()) ||
      v.make.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('vehicles.title')}
        subtitle={`${vehicles.length} ${t('vehicles.subtitle')}`}
        actions={
          <div className="flex items-center gap-2">
            <DemoBadge visible={mode === 'demo'} />
            <Button
              onClick={() => { setSaveError(''); setAddOpen(true) }}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
          >
            {t('vehicles.registerBtn')}
            </Button>
          </div>
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <SearchBar value={search} onChange={setSearch} placeholder={t('vehicles.search')} />
          <select className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>{t('vehicles.filter.allMakes')}</option>
            <option>Toyota</option>
            <option>Honda</option>
            <option>BMW</option>
            <option>Hyundai</option>
            <option>Ford</option>
          </select>
          <span className="text-xs text-slate-400 ms-auto">{filtered.length} {t('vehicles.results')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('vehicles.col.vehicle')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('vehicles.col.plateVin')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('vehicles.col.customer')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('vehicles.col.mileage')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('vehicles.col.lastService')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('vehicles.col.nextService')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('vehicles.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{v.year} {v.make} {v.model}</p>
                    <p className="text-xs text-slate-400" dir="ltr">{v.id}</p>
                  </td>
                  <td className="px-6 py-4" dir="ltr">
                    <p className="font-mono text-sm font-medium text-slate-800">{v.plate}</p>
                    <p className="text-xs text-slate-400 font-mono">{v.vin}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{v.customer}</td>
                  <td className="px-6 py-4 text-slate-600" dir="ltr">{v.mileage} {t('vehicles.kmSuffix')}</td>
                  <td className="px-6 py-4 text-slate-600">{v.lastService}</td>
                  <td className="px-6 py-4 text-slate-600">{v.nextService}</td>
                  <td className="px-6 py-4"><Badge variant={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Detail Modal */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`${selected.year} ${selected.make} ${selected.model}`}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>{t('action.close')}</Button>
              <Button>{t('vehicles.detail.newJobCard')}</Button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('vehicles.detail.plate'), value: <span dir="ltr">{selected.plate}</span> },
                { label: t('vehicles.detail.vin'), value: <span dir="ltr">{selected.vin}</span> },
                { label: t('vehicles.detail.make'), value: selected.make },
                { label: t('vehicles.detail.model'), value: selected.model },
                { label: t('vehicles.detail.year'), value: selected.year },
                { label: t('vehicles.detail.mileage'), value: <span dir="ltr">{selected.mileage} {t('vehicles.kmSuffix')}</span> },
                { label: t('vehicles.detail.customer'), value: selected.customer },
                { label: t('vehicles.detail.lastService'), value: selected.lastService },
                { label: t('vehicles.detail.nextService'), value: selected.nextService },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800 font-mono">{item.value}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('vehicles.detail.serviceHistory')}</h3>
              <div className="flex flex-col gap-2">
                {[
                  { date: selected.lastService, desc: 'Full service & oil change', job: 'JC-2024-0891', cost: 'SAR 850' },
                  { date: '15 Jun 2024', desc: 'Brake pad replacement', job: 'JC-2024-0654', cost: 'SAR 420' },
                  { date: '10 Feb 2024', desc: 'AC service & filter change', job: 'JC-2024-0312', cost: 'SAR 280' },
                ].map((h) => (
                  <div key={h.job} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{h.desc}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{h.date} · <span className="font-mono" dir="ltr">{h.job}</span></p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700" dir="ltr">{h.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('vehicles.modal.registerTitle')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>{t('action.cancel')}</Button>
            <Button loading={saving} onClick={() => (document.getElementById('vehicle-register-form') as HTMLFormElement | null)?.requestSubmit()}>{t('vehicles.modal.registerBtn')}</Button>
          </>
        }
      >
        <form id="vehicle-register-form" onSubmit={handleRegister} className="flex flex-col gap-4">
          {saveError && (
            <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{saveError}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input name="make" label={t('vehicles.form.make')} placeholder="Toyota" required />
            <Input name="model" label={t('vehicles.form.model')} placeholder="Camry" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input name="year" label={t('vehicles.form.year')} type="number" placeholder="2023" required />
            <Input name="plate" label={t('vehicles.form.plate')} placeholder="ABC-1234" required />
          </div>
          <Input name="vin" label={t('vehicles.form.vin')} placeholder="Enter 17-character VIN" />
          <Input name="mileage" label={t('vehicles.form.mileage')} type="number" placeholder="0" />
          <Select name="customer" label={t('vehicles.form.customer')} options={[
            { value: '', label: t('vehicles.form.selectCustomer') },
            { value: 'c1', label: 'Mohammed Al-Rashid' },
            { value: 'c2', label: 'Sarah Al-Anazi' },
            { value: 'c3', label: 'Rayan Omar' },
          ]} required />
        </form>
      </Modal>
    </div>
  )
}
