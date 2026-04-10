const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractVariables,
  renderPrompt,
  normalizeImportPayload,
} = require('../assets/prompt-utils.js');

test('extractVariables returns unique variables in encounter order', () => {
  const variables = extractVariables('Hello {{name}}, role {{role}} and {{name}}');
  assert.deepEqual(variables, ['name', 'role']);
});

test('renderPrompt uses local values over global values and blanks missing vars', () => {
  const output = renderPrompt('Hi {{name}} from {{team}} / {{missing}}', {
    localValues: { name: 'Ari' },
    globalValues: { team: 'Infra', name: 'Global' },
  });
  assert.equal(output, 'Hi Ari from Infra / ');
});

test('normalizeImportPayload filters invalid data while preserving valid templates', () => {
  const normalized = normalizeImportPayload({
    globalVariables: [{ key: 'company', value: 'Acme' }, { key: '', value: 'skip' }],
    templates: [{ id: '1', name: 'Greeting', content: 'Hi {{name}}', variables: ['name'] }, { foo: 'bad' }],
  });

  assert.deepEqual(normalized.globalVariables, [{ key: 'company', value: 'Acme' }]);
  assert.equal(normalized.templates.length, 1);
  assert.equal(normalized.templates[0].name, 'Greeting');
});
