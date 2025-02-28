/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

import channelIDs from '../../src/discord/channelIDs';
import guildIDs from '../../src/discord/guildIDs';

// Define the response type
interface DiscordResponse {
	author: {
		username: string;
	};
	content: string;
}

// Initialize Discord client
Cypress.Commands.add('initDiscordClient', () => {
	cy.task('initDiscordClient').then((client) => {
		cy.wrap(client).as('discordClient');
	});
});

// Send a message to Discord and verify the bot response
Cypress.Commands.add('sendDiscordMessage', (
	message: string,
	botName: string,
	expectedResponsePattern: RegExp,
	channelId: string = channelIDs.NebulaChat
) => {
	cy.task('sendDiscordMessage', {
		message,
		channelId,
		guildId: guildIDs.StarbunkCrusaders
	}).then((response) => {
		// Type assertion for the response
		const typedResponse = response as DiscordResponse;
		// Verify the response
		expect(typedResponse.author.username).to.equal(botName);
		expect(typedResponse.content).to.match(expectedResponsePattern);
	});
});

// Simulate a message from a user and render the response in the test UI
Cypress.Commands.add('simulateMessage', (message: string, userId: string) => {
	cy.task('sendDiscordMessage', {
		message,
		channelId: channelIDs.NebulaChat,
		guildId: guildIDs.StarbunkCrusaders,
		userId
	}).then((response) => {
		// Create a div to display the bot response
		cy.get('body').then(($body) => {
			if (!$body.find('[data-testid="bot-response"]').length) {
				$body.append('<div data-testid="bot-response"></div>');
			}

			// Type assertion for the response
			const typedResponse = response as DiscordResponse;

			// Log the response for debugging
			cy.log('Bot response:', typedResponse);

			// Set the response content using jQuery's html method
			cy.get('[data-testid="bot-response"]').then(($el) => {
				// Use text method instead of html to avoid HTML parsing issues
				$el.text(typedResponse.content);
			});
		});
	});
});
