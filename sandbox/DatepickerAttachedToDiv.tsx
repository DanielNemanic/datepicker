import DatepickerImperativeControls from './DatepickerImperativeControls'
import {useDatepicker} from './useDatepicker'
import {DatepickerOptions} from '../src/types'
import useSliderValuesCheckbox from './useSliderValuesCheckbox'

export default function DatepickerAttachedToDiv() {
  const options: DatepickerOptions = {
    alwaysShow: true,
  }
  const [jsx, picker] = useDatepicker({
    pickerKey: 'DatepickerAttachedToDiv',
    type: 'div',
    options,
  })

  const checkbox = useSliderValuesCheckbox(picker)

  return (
    <section>
      {checkbox}
      <h3>
        Datepicker attached to a <code>&lt;div&gt;</code>
      </h3>
      <DatepickerImperativeControls picker={picker} options={options} />

      {/* Datepicker is attached to this div. */}
      {jsx}
    </section>
  )
}