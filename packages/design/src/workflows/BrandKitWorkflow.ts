import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { DesignBrandEngine } from '../engines/DesignBrandEngine.js';
import { DesignLogoEngine } from '../engines/DesignLogoEngine.js';
import { DesignPaletteEngine } from '../engines/DesignPaletteEngine.js';
import { DesignTypographyEngine } from '../engines/DesignTypographyEngine.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import type { DesignBrandResult } from '../types/DesignBrand.js';
import type { DesignLogoResult } from '../types/DesignLogo.js';
import type { DesignPaletteResult } from '../types/DesignPalette.js';
import type { DesignTypographyResult } from '../types/DesignTypography.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const BRAND_KIT_WORKFLOW_ID = 'design.workflow.brand-kit';

export interface BrandKitWorkflowInput {
  readonly brandName: string;
  readonly industry?: string;
  readonly targetAudience?: string;
  readonly style?: string;
}

export interface BrandKitResult {
  readonly brand: DesignBrandResult;
  readonly logo: DesignLogoResult;
  readonly palette: DesignPaletteResult;
  readonly typography: DesignTypographyResult;
}

export interface BrandKitWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: DesignEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface BrandKitWorkflowState {
  readonly input: BrandKitWorkflowInput;
  readonly provider: Provider;
  brand?: DesignBrandResult;
  logo?: DesignLogoResult;
  palette?: DesignPaletteResult;
  typography?: DesignTypographyResult;
}

/**
 * `design.brand` establishes an initial creative direction (a logo
 * concept, a starter palette, starter typography, guidelines); this step
 * always runs first because every step after it reads `state.brand`.
 */
class BrandStep implements WorkflowStep<BrandKitWorkflowState> {
  readonly name = 'design.brand';
  private readonly engine: DesignBrandEngine;

  constructor(config: BrandKitWorkflowConfig) {
    this.engine = new DesignBrandEngine(config);
  }

  async execute(state: BrandKitWorkflowState): Promise<void> {
    state.brand = await this.engine.execute(
      buildEngineContext(state.provider, 'design.brand', {
        brief: `Create a brand identity for ${state.input.brandName}.`,
        targetAudience: state.input.targetAudience,
        style: state.input.style,
        industry: state.input.industry,
      })
    );
  }
}

/** Refines BrandStep's initial logo concept into a dedicated logo, informed by the emerging palette/typography. */
class LogoStep implements WorkflowStep<BrandKitWorkflowState> {
  readonly name = 'design.logo';
  private readonly engine: DesignLogoEngine;

  constructor(config: BrandKitWorkflowConfig) {
    this.engine = new DesignLogoEngine(config);
  }

  async execute(state: BrandKitWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, BrandStep has already
    // completed successfully and state.brand is guaranteed set.
    const brand = state.brand as DesignBrandResult;

    state.logo = await this.engine.execute(
      buildEngineContext(state.provider, 'design.logo', {
        brief: `Create a logo for ${state.input.brandName}, consistent with this brand direction: ${
          brand.guidelines ?? 'a cohesive brand identity'
        }.`,
        targetAudience: state.input.targetAudience,
        style: state.input.style,
        branding: { brandName: state.input.brandName, colors: brand.palette, fonts: brand.typography },
      })
    );
  }
}

/** Refines BrandStep's starter palette into named, roled colors. */
class PaletteStep implements WorkflowStep<BrandKitWorkflowState> {
  readonly name = 'design.palette';
  private readonly engine: DesignPaletteEngine;

  constructor(config: BrandKitWorkflowConfig) {
    this.engine = new DesignPaletteEngine(config);
  }

  async execute(state: BrandKitWorkflowState): Promise<void> {
    const brand = state.brand as DesignBrandResult;

    state.palette = await this.engine.execute(
      buildEngineContext(state.provider, 'design.palette', {
        brief: `Refine the color palette for ${state.input.brandName}.`,
        targetAudience: state.input.targetAudience,
        style: state.input.style,
        branding: { brandName: state.input.brandName, colors: brand.palette },
      })
    );
  }
}

/** Refines BrandStep's starter typography into detailed font pairings. */
class TypographyStep implements WorkflowStep<BrandKitWorkflowState> {
  readonly name = 'design.typography';
  private readonly engine: DesignTypographyEngine;

  constructor(config: BrandKitWorkflowConfig) {
    this.engine = new DesignTypographyEngine(config);
  }

  async execute(state: BrandKitWorkflowState): Promise<void> {
    const brand = state.brand as DesignBrandResult;

    state.typography = await this.engine.execute(
      buildEngineContext(state.provider, 'design.typography', {
        brief: `Refine font pairings for ${state.input.brandName}.`,
        targetAudience: state.input.targetAudience,
        style: state.input.style,
        branding: { brandName: state.input.brandName, fonts: brand.typography },
      })
    );
  }
}

/**
 * Composes 4 existing @aidex/design engines into one pipeline —
 * design.brand → design.logo → design.palette → design.typography —
 * using @aidex/workflow's real Workflow/WorkflowStep/WorkflowExecutor
 * contract. Zero new engines, zero new prompts, zero new providers: every
 * step calls exactly the Engine `@aidex/design` already ships. Steps
 * communicate forward by mutating the shared WorkflowContext in place —
 * design.brand's output becomes the `branding` context for the three
 * steps after it, so the kit converges on one coherent identity instead
 * of four unrelated results.
 */
export class BrandKitWorkflow {
  readonly id = BRAND_KIT_WORKFLOW_ID;
  readonly name = 'Brand Kit';
  readonly description =
    'Creates a complete brand kit — brand identity, logo, palette, and typography — from a brand name.';

  private readonly workflow = new Workflow<BrandKitWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: BrandKitWorkflowConfig = {}) {
    this.workflow.addStep(new BrandStep(config));
    this.workflow.addStep(new LogoStep(config));
    this.workflow.addStep(new PaletteStep(config));
    this.workflow.addStep(new TypographyStep(config));
  }

  async run(
    input: BrandKitWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<BrandKitResult> {
    const state: BrandKitWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      brand: finalState.brand as DesignBrandResult,
      logo: finalState.logo as DesignLogoResult,
      palette: finalState.palette as DesignPaletteResult,
      typography: finalState.typography as DesignTypographyResult,
    };
  }
}
