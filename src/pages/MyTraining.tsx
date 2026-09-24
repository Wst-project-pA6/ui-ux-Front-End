import { PageHeader } from '../components/ui/PageHeader'
import { useLang } from '../i18n/LanguageContext'
import StudentTraining from '../components/training/StudentTraining'

/**
 * Student's personal training route. Renders the same StudentTraining
 * experience as /training (single implementation, no duplication).
 */
export default function MyTraining() {
  const { t } = useLang()
  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.myTraining')} subtitle={t('training.subtitleStudent')} />
      <StudentTraining />
    </div>
  )
}
