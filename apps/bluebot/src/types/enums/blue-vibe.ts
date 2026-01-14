/**
 * Enum of possible blue vibes that BlueBot can detect in messages
 */
export enum BlueVibe {
	/** User is clearly talking about blue or BLU on purpose */
	BlueGeneral = 'blueGeneral',
	/** User is intentionally trying to talk about blue/BLU without naming it directly */
	BlueSneaky = 'blueSneaky',
	/** User brushes up against blue/BLU incidentally rather than on purpose */
	BlueMention = 'blueMention',
	/** User is directly asking BlueBot to do something blue-themed */
	BlueRequest = 'blueRequest',
	/** User is not talking about blue/BLU at all */
	NotBlue = 'notBlue',
}
