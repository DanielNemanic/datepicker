import Data from './Data'
import DatepickerAttachedToDiv from './DatepickerAttachedToDiv'
import DatepickerAttachedToInput from './DatepickerAttachedToInput'
import DatepickerOLDAttachedToInput from './DatepickerOLDAttachedToInput'
import DaterangePickers from './DaterangePickers'
import DaterangePickersOLD from './DaterangePickersOLD'
import ShadowDOMExample from './ShadowDOMExample'

export default function NewApp() {
  return (
    <div className="main-grid">
      <Data />
      <DatepickerAttachedToDiv />
      <DatepickerAttachedToInput />
      <DatepickerOLDAttachedToInput />
      <DaterangePickers />
      <ShadowDOMExample />
      <DaterangePickersOLD />
    </div>
  )
}
