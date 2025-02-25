import { ratmasAdjustDateCommand } from './ratmasAdjustDate';
import { ratmasCheckCommand } from './ratmasCheck';
import { ratmasEndCommand } from './ratmasEnd';
import { ratmasReportCommand } from './ratmasReport';
import { ratmasWishlistCommand } from './ratmasWishlist';
import { startRatmasCommand } from './startRatmas';

export const ratmasCommands = [
	startRatmasCommand,
	ratmasWishlistCommand,
	ratmasCheckCommand,
	ratmasReportCommand,
	ratmasAdjustDateCommand,
	ratmasEndCommand
];
