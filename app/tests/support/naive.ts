import type {VueWrapper} from '@vue/test-utils';
import {NCheckbox, NSelect} from 'naive-ui';

/**
 * Finding Naive UI controls in a mounted view.
 *
 * NSelect and NCheckbox are not native form controls: a non-filterable NSelect
 * renders no <input> at all, and NCheckbox renders a div with role="checkbox".
 * An `id` still reaches their root element through attribute fallthrough, so
 * that is what these helpers match on -- the same id the view labels them with.
 */

export function selectById(wrapper: VueWrapper, id: string) {
  const found = wrapper.findAllComponents(NSelect).find((s) => s.attributes('id') === id);
  if (found === undefined) {
    throw new Error(`no NSelect with id "${id}"`);
  }
  return found;
}

/** Picks a value the way a user choosing from the dropdown would. */
export async function chooseInSelect(
  wrapper: VueWrapper,
  id: string,
  value: unknown,
): Promise<void> {
  await selectById(wrapper, id).setValue(value, 'value');
}

/** The values on offer, in the order they are offered. */
export function optionValues(wrapper: VueWrapper, id: string): unknown[] {
  const options = selectById(wrapper, id).props('options') as {value?: unknown}[];
  return options.map((o) => o.value);
}

export function optionLabels(wrapper: VueWrapper, id: string): unknown[] {
  const options = selectById(wrapper, id).props('options') as {label?: unknown}[];
  return options.map((o) => o.label);
}

export function checkboxById(wrapper: VueWrapper, id: string) {
  const found = wrapper.findAllComponents(NCheckbox).find((c) => c.attributes('id') === id);
  if (found === undefined) {
    throw new Error(`no NCheckbox with id "${id}"`);
  }
  return found;
}

export async function setCheckbox(
  wrapper: VueWrapper,
  id: string,
  checked: boolean,
): Promise<void> {
  await checkboxById(wrapper, id).setValue(checked, 'checked');
}

export function isChecked(wrapper: VueWrapper, id: string): boolean {
  return checkboxById(wrapper, id).attributes('aria-checked') === 'true';
}
