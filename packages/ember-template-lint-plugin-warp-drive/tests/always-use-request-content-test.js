import { generateRuleTests } from 'ember-template-lint';
import plugin from '../src/index.js';

// Simple test framework fallbacks for standalone testing
const beforeEach = () => {};
const describe = (name, fn) => {
  console.log(`Running test suite: ${name}`);
  fn();
};
const it = (name, fn) => {
  console.log(`  Test: ${name}`);
  try {
    fn();
    console.log('    ✓ passed');
  } catch (error) {
    console.log(`    ✗ failed: ${error.message}`);
  }
};

generateRuleTests({
  name: 'always-use-request-content',
  
  groupMethodBefore: beforeEach,
  groupingMethod: describe,
  testMethod: it,
  plugins: [plugin],
  
  config: true,
  
  good: [
    // Request with content block that uses the yielded result
    '<Request @request={{@request}}><:content as |result|>{{result.data.attributes.name}}</:content></Request>',
    
    // Request with content block using result in nested context
    '<Request @request={{@request}}><:content as |result|><div>{{result.title}}</div></:content></Request>',
    
    // Request with content block using result with different variable name
    '<Request @request={{@request}}><:content as |data|>{{data.attributes.title}}</:content></Request>',
    
    // Request with content block using result and state
    '<Request @request={{@request}}><:content as |result state|>{{result.data.name}} - Online: {{state.isOnline}}</:content></Request>',
    
    // Request with content block using only state (second parameter)
    '<Request @request={{@request}}><:content as |result state|>Online: {{state.isOnline}}</:content></Request>',
    
    // Request with no content block but has other blocks
    '<Request @request={{@request}}><:idle>Waiting</:idle><:loading>Loading...</:loading><:error as |error|>{{error.message}}</:error></Request>',
    
    // Request with no content block but has other blocks (different order)
    '<Request @request={{@request}}><:loading>Loading...</:loading><:error as |error|>{{error.message}}</:error><:idle>Waiting</:idle></Request>',
    
    // Request with no content block but has loading and error blocks only
    '<Request @request={{@request}}><:loading>Loading...</:loading><:error>Error occurred</:error></Request>',
    
    // Request with multiple blocks including content with used result
    '<Request @request={{@request}}><:loading>Loading...</:loading><:error as |error|>{{error.message}}</:error><:content as |result|>{{result.data.name}}</:content></Request>',
    
    // Request with content block using result in helper
    '<Request @request={{@request}}><:content as |result|>{{uppercase result.data.name}}</:content></Request>',
    
    // Request with content block using result in component argument
    '<Request @request={{@request}}><:content as |result|><MyComponent @data={{result}} /></:content></Request>',
    
    // Request with content block using result in conditional
    '<Request @request={{@request}}><:content as |result|>{{#if result.data}}Success{{/if}}</:content></Request>',
    
    // Request with content block using result in iteration
    '<Request @request={{@request}}><:content as |result|>{{#each result.data as |item|}}{{item.name}}{{/each}}</:content></Request>',
  ],
  
  bad: [
    // Request with content block but no yielded parameters
    {
      template: '<Request @request={{@request}}><:content>Hello World</:content></Request>',
      result: {
        rule: 'always-use-request-content',
        message: 'The <Request> component\'s content block should yield a result parameter that is used within the block',
        line: 1,
        column: 0,
      },
    },
    
    // Request with content block yielding result but not using it
    {
      template: '<Request @request={{@request}}><:content as |result|>Hello World</:content></Request>',
      result: {
        rule: 'always-use-request-content',
        message: 'The <Request> component\'s content block yields a result parameter \'result\' that is not used within the block',
        line: 1,
        column: 0,
      },
    },
    
    // Request with content block yielding result and state but using neither
    {
      template: '<Request @request={{@request}}><:content as |result state|>Hello World</:content></Request>',
      result: {
        rule: 'always-use-request-content',
        message: 'The <Request> component\'s content block yields a result parameter \'result\' that is not used within the block',
        line: 1,
        column: 0,
      },
    },
    
    // Request with content block yielding with different name but not using it
    {
      template: '<Request @request={{@request}}><:content as |data|>Hello World</:content></Request>',
      result: {
        rule: 'always-use-request-content',
        message: 'The <Request> component\'s content block yields a result parameter \'data\' that is not used within the block',
        line: 1,
        column: 0,
      },
    },
    
    // Request with no content block and no other blocks
    {
      template: '<Request @request={{@request}}>Hello World</Request>',
      result: {
        rule: 'always-use-request-content',
        message: 'The <Request> component should use named blocks (e.g., :content, :loading, :error, :idle) instead of default content',
        line: 1,
        column: 0,
      },
    },
    
    // Request with no blocks at all
    {
      template: '<Request @request={{@request}} />',
      result: {
        rule: 'always-use-request-content',
        message: 'The <Request> component should have at least one named block (e.g., :content, :loading, :error, :idle)',
        line: 1,
        column: 0,
      },
    },
  ],
});