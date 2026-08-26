import {describe, expect, it, vi} from 'vitest';
import {mount, type VueWrapper} from '@vue/test-utils';
import JsonEditor from '@/components/JsonEditor.vue';
import type {Completion} from '@/model/query-dsl-completer';

const OFFERED: Completion[] = [
  {label: 'query', meta: 'property'},
  {label: 'quality', meta: 'property'},
];

type Completer = (text: string, cursor: number) => Completion[];

/**
 * The editor with its model wired back to itself, so what accepting a
 * completion leaves in the text is visible the way it is on the screen.
 */
function editor(complete?: Completer): {wrapper: VueWrapper; text: () => string} {
  let text = '';
  const wrapper: VueWrapper = mount(JsonEditor, {
    props: {
      id: 'json',
      modelValue: '',
      complete,
      'onUpdate:modelValue': (value: string) => {
        text = value;
        void wrapper.setProps({modelValue: value});
      },
    },
  });
  return {wrapper, text: () => text};
}

function options(wrapper: VueWrapper): string[] {
  return wrapper.findAll('[role="option"] .k-completion-label').map((li) => li.text());
}

function selected(wrapper: VueWrapper): string | undefined {
  return wrapper
    .findAll('[role="option"]')
    .find((li) => li.attributes('aria-selected') === 'true')
    ?.text();
}

async function type(wrapper: VueWrapper, value: string): Promise<void> {
  await wrapper.find('#json').setValue(value);
}

async function press(wrapper: VueWrapper, init: KeyboardEventInit): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, ...init});
  wrapper.find('#json').element.dispatchEvent(event);
  await wrapper.vm.$nextTick();
  return event;
}

describe('JsonEditor', () => {
  it('is a plain textarea when no completer is given', async () => {
    const {wrapper} = editor();
    await type(wrapper, '{"que');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('offers what the completer returns once something has been typed', async () => {
    const {wrapper} = editor(() => OFFERED);
    await type(wrapper, '{"que');
    expect(options(wrapper)).toEqual(['query', 'quality']);
  });

  it('asks the completer where the caret is', async () => {
    const complete = vi.fn(() => OFFERED);
    const {wrapper} = editor(complete);
    await type(wrapper, '{"que');
    expect(complete).toHaveBeenCalledWith('{"que', 5);
  });

  it('opens on a quote before anything is typed', async () => {
    const {wrapper} = editor(() => OFFERED);
    await type(wrapper, '{"');
    expect(options(wrapper)).toEqual(['query', 'quality']);
  });

  it('stays shut on a character that opens neither a key nor a value', async () => {
    const {wrapper} = editor(() => OFFERED);
    await type(wrapper, '{');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('stays shut when the completer offers nothing', async () => {
    const {wrapper} = editor(() => []);
    await type(wrapper, '{"zzz');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('opens wherever the caret is on Ctrl+Space', async () => {
    const {wrapper} = editor(() => OFFERED);
    await press(wrapper, {code: 'Space', ctrlKey: true});
    expect(options(wrapper)).toEqual(['query', 'quality']);
  });

  it('starts on the first option and walks down', async () => {
    const {wrapper} = editor(() => OFFERED);
    await type(wrapper, '{"que');
    expect(selected(wrapper)).toContain('query');
    await press(wrapper, {key: 'ArrowDown'});
    expect(selected(wrapper)).toContain('quality');
  });

  it('wraps around at the end of the list', async () => {
    const {wrapper} = editor(() => OFFERED);
    await type(wrapper, '{"que');
    await press(wrapper, {key: 'ArrowUp'});
    expect(selected(wrapper)).toContain('quality');
  });

  it('accepts the highlighted option on Enter', async () => {
    const {wrapper, text} = editor(() => OFFERED);
    await type(wrapper, '{"que');
    await press(wrapper, {key: 'Enter'});
    expect(text()).toBe('{"query": ');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('accepts the highlighted option on Tab', async () => {
    const {wrapper, text} = editor(() => OFFERED);
    await type(wrapper, '{"que');
    await press(wrapper, {key: 'ArrowDown'});
    await press(wrapper, {key: 'Tab'});
    expect(text()).toBe('{"quality": ');
  });

  it('accepts the option that is clicked', async () => {
    const {wrapper, text} = editor(() => OFFERED);
    await type(wrapper, '{"que');
    await wrapper.findAll('[role="option"]')[1].trigger('mousedown');
    expect(text()).toBe('{"quality": ');
  });

  it('leaves the caret where the accepted word ends', async () => {
    const {wrapper} = editor(() => OFFERED);
    await type(wrapper, '{"que');
    await press(wrapper, {key: 'Enter'});
    await wrapper.vm.$nextTick();
    expect((wrapper.find('#json').element as HTMLTextAreaElement).selectionStart).toBe(10);
  });

  it('leaves the text alone on Escape', async () => {
    const {wrapper, text} = editor(() => OFFERED);
    await type(wrapper, '{"que');
    await press(wrapper, {key: 'Escape'});
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(text()).toBe('{"que');
  });

  it('takes Enter only while it is open, so a newline still reaches the textarea', async () => {
    const {wrapper} = editor(() => OFFERED);
    await type(wrapper, '{"que');
    expect((await press(wrapper, {key: 'Enter'})).defaultPrevented).toBe(true);
    await type(wrapper, '{');
    expect((await press(wrapper, {key: 'Enter'})).defaultPrevented).toBe(false);
  });

  it('still reports invalid JSON', async () => {
    const {wrapper} = editor(() => OFFERED);
    await type(wrapper, '{"a"');
    expect(wrapper.text()).toContain('JSON');
  });

  it('still formats valid JSON', async () => {
    const {wrapper, text} = editor(() => OFFERED);
    await type(wrapper, '{"a":1}');
    await wrapper.find('button').trigger('click');
    expect(text()).toBe('{\n  "a": 1\n}');
  });
});
