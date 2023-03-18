import {createElement, useRef, useEffect, ReactNode} from 'react'
import {
  DatepickerInstance,
  DatepickerOptions,
  DaterangePickerInstance,
  DaterangePickerOptions,
  Expand,
  Selector,
} from '../src/types'
import datepicker from '../src/datepicker'
import {useRecoilState, useResetRecoilState} from 'recoil'
import {datepickerAtomFamily} from './state'

type UseDatepickerProps = {
  pickerKey: string
  type?: string
  selector?: Selector
  props?: Record<string, unknown>
  options?: DatepickerOptions | DaterangePickerOptions
}

export function useDatepicker({
  // TODO - prevent initializing with the same pickerKey more than once.
  pickerKey,
  type,
  selector,
  props = {},
  options = {},
}: UseDatepickerProps): [ReactNode, DatepickerInstance | null] {
  const ref = useRef(null)
  const reactNode = selector
    ? null
    : createElement(type ?? '', {
        ...(type === 'div' ? {dangerouslySetInnerHTML: {__html: ''}} : {}),
        ...props,
        ref,
      })

  // Using Recoil in case we want access to the picker anywhere else in the app.
  const [picker, setPicker] = useRecoilState(datepickerAtomFamily(pickerKey))
  const resetPicker = useResetRecoilState(datepickerAtomFamily(pickerKey))

  useEffect(() => {
    const pickerItem = datepicker(selector ?? ref.current, options)
    setPicker(pickerItem)

    return () => {
      pickerItem?.remove()
      resetPicker()
    }
  }, [])

  return [reactNode, picker as DatepickerInstance | null]
}

type UseDaterangePickerProps = Expand<
  Omit<UseDatepickerProps, 'options'> & {
    options: DaterangePickerOptions
  }
>

export function useDaterangePicker({
  pickerKey,
  type,
  options,
}: UseDaterangePickerProps): [ReactNode, DaterangePickerInstance | null] {
  if (!('id' in options)) {
    throw new Error('No id found for daterange picker.')
  }

  const [element, picker] = useDatepicker({pickerKey, type, options})
  return [element, picker as DaterangePickerInstance | null]
}
