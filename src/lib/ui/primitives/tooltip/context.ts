import type { Tooltip } from 'bits-ui';
import { createContext } from 'svelte';

/** Set by a `TooltipGroup`: the tooltips inside it share one tooltip, which moves between them. */
export const [getTooltipGroup, setTooltipGroup, inTooltipGroup] = createContext<Tooltip.Tether<string>>();
