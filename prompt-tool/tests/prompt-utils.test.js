const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractVariables,
  renderPrompt,
  normalizeImportPayload,
  upsertTemplate,
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

test('upsertTemplate updates an existing template while preserving createdAt', () => {
  const templates = [{
    id: 'abc123',
    name: 'Old Name',
    content: 'Hello {{name}}',
    variables: ['name'],
    createdAt: 1700000000000,
  }];

  const updated = upsertTemplate(templates, {
    id: 'abc123',
    name: 'New Name',
    content: 'Hi {{first_name}}',
  });

  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, 'abc123');
  assert.equal(updated[0].name, 'New Name');
  assert.equal(updated[0].createdAt, 1700000000000);
  assert.deepEqual(updated[0].variables, ['first_name']);
});
