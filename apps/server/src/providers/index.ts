// Types
export * from './types';

// Registry service
export { ProviderRegistryService, createProviderRegistry } from './registry';

// Selection service
export { ProviderSelectionService, createProviderSelection } from './selection';

// Invocation service
export { ModelInvocationService, createModelInvocation } from './invocation';

// Config service
export {
  ProviderConfigService,
  createProviderConfigService,
  type ConfigLoadResult,
  type ProviderConfigServiceOptions,
} from './config-service';

// Integrated invocation service
export {
  IntegratedInvocationService,
  createIntegratedInvocation,
  type IntegratedInvocationOptions,
  type IntegratedLoadResult,
  type IntegratedInvokeResult,
  type SelectionWithConfigResult,
} from './integrated-invocation';

// Unified service container
import { ProviderRegistryService, createProviderRegistry } from './registry';
import { ProviderSelectionService, createProviderSelection } from './selection';
import { ModelInvocationService, createModelInvocation } from './invocation';

/**
 * Container for all provider-related services
 */
export type ProviderServices = {
  readonly registry: ProviderRegistryService;
  readonly selection: ProviderSelectionService;
  readonly invocation: ModelInvocationService;
};

/**
 * Create a unified set of provider services
 */
export function createProviderServices(): ProviderServices {
  const registry = createProviderRegistry();
  const selection = createProviderSelection(registry);
  const invocation = createModelInvocation(registry, selection);

  return {
    registry,
    selection,
    invocation,
  };
}
