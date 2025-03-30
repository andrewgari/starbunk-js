**Requirements Document: Starbunk-JS TTRPG Assistance (System Agnostic) - Enhanced**

**1. Introduction**

* **1.1 Purpose:** This document outlines the requirements for a set of Discord bot slash commands designed to assist with TTRPG gameplay, allowing for system-agnostic core functionalities while maintaining system-specific information retrieval and dynamic content updates.
* **1.2 Scope:** This feature will enable players and the Game Master (GM) to interact with the bot to access game information, manage campaign progress, receive assistance during gameplay, and dynamically update game information based on new documents and player/GM notes.
* **1.3 Target Audience:** Players and GMs of various TTRPG campaigns.

**2. Functional Requirements**

* **2.1 Document Retrieval and Question Answering (System Agnostic):**
    * The bot shall be able to retrieve information from user-provided documents (PDF, Google Docs, etc.).
    * The bot shall be able to answer user questions based on the content of these documents.
    * The bot shall cite the source documents when providing answers.
    * The bot shall utilize a vector database for efficient information retrieval.
    * The bot shall have a system configuration setting to determine which set of documents to use for answering questions.
    * **2.1.1 Dynamic Document Updates:**
        * The bot shall periodically scan a designated drive folder for new documents.
        * The bot shall automatically process and index new documents.
        * The bot shall categorize information within the documents into predefined categories (characters, locations, events, items, etc.).
        * Duplication of information across categories is acceptable.
* **2.2 System-Specific Assistance (System Relevant):**
    * The bot shall be able to provide system-specific information based on the configured TTRPG system.
    * The bot shall be able to handle system-specific rules and mechanics.
    * The bot shall allow the GM to add and configure system specific information.
* **2.3 Campaign Progress Tracking (System Agnostic):**
    * The bot shall allow players to track character levels, experience points, inventory, and other relevant information.
    * The bot shall provide commands for updating and retrieving campaign progress data.
    * The bot shall allow the GM to add system specific tracking data.
* **2.4 GM-Specific Features (System Agnostic):**
    * The bot shall provide commands for the GM to access restricted information from uploaded documents.
    * The bot shall allow the GM to manage campaign progress and player data.
    * The bot shall provide a way for the GM to add and retrieve notes that are only visible to the GM.
    * The bot shall allow the GM to create and manage in game locations, npcs, and items.
    * The bot shall allow the GM to create and manage in game events, and track event progress.
    * The bot shall allow the GM to create and manage random encounters.
    * **2.4.1 Strict GM Information Isolation:**
        * **All information designated as GM-only shall be completely isolated from player access.**
        * This includes, but is not limited to, notes, hidden locations, monster stats, and plot details.
        * The bot shall enforce this isolation through role-based access and separate data storage or access control mechanisms.
* **2.5 Discord Role-Based Access (System Agnostic):**
    * The bot shall use Discord roles to control access to GM-specific features.
    * A designated "GM" role shall be required to access restricted information.
* **2.6 Command Interface (System Agnostic):**
    * The bot shall provide a set of Discord **slash commands** for interacting with the TTRPG assistance features.
    * Commands shall be intuitive and easy to use.
    * Commands shall provide feedback to the user.
* **2.7 Note Taking (System Agnostic):**
    * The bot shall allow players and the GM to take notes related to the campaign.
    * The bot shall have functionality to save, edit, retrieve, and delete notes.
    * The bot shall have functionality to tag notes.
    * **2.7.1 Note Integration:**
        * Player notes shall be integrated into the core information database.
        * GM notes shall be treated as authoritative and override player notes where conflicts occur.
        * The bot should be able to display the author of the note.
* **2.8 Random Number Generation (System Agnostic):**
    * The bot shall provide commands for rolling virtual dice.
    * The bot shall allow for specifying the number and type of dice to roll.
    * The bot shall provide modifiers to dice rolls.
    * The bot shall allow the GM to create custom roll tables.

**3. Non-Functional Requirements**

* **3.1 Performance:**
    * The bot shall respond to commands within a reasonable timeframe (e.g., within 5 seconds).
    * The bot shall handle multiple concurrent requests without significant performance degradation.
    * Dynamic document parsing should not cause significant delays.
* **3.2 Usability:**
    * The bot shall be easy to use and understand for players and the GM.
    * The bot shall provide clear and concise feedback to users.
* **3.3 Reliability:**
    * The bot shall operate reliably and consistently.
    * The bot shall handle errors gracefully and provide informative error messages.
* **3.4 Security:**
    * The bot shall protect sensitive campaign data and user information.
    * Access to GM-specific features shall be strictly restricted to authorized users.
* **3.5 Maintainability:**
    * The bot's codebase shall be well-structured and documented for easy maintenance and updates.
    * The system specific data, should be stored in a easy to edit format.
* **3.6 Scalability:**
    * The bot shall be designed to handle a growing number of users and campaign data.

**4. Technology Stack**

* **Discord.js:** For Discord bot development.
* **Node.js:** Runtime environment.
* **pdf-parse/pdf-lib:** For PDF processing.
* `@googleapis/docs`: For Google Docs API interaction.
* **Google Drive API:** For monitoring and retrieving documents.
* **Vector Database Library:** For vector databases.
* **LLM Library:** For embeddings and language models.
* **Database Library:** For database storage.
* **dotenv:** For managing environment variables.
* **JSON/YAML/TOML:** For storing system-specific data.

**5. Use Cases**

* **5.7 Dynamic Document Update:**
    * GM adds a new Google Doc to the designated drive folder.
    * Bot automatically processes the document, extracts information, and updates the vector database.
    * Bot categorizes the information into characters, locations, events, etc.
* **5.8 Player adds a note:**
    * Player: `/add-note "The merchant seemed shifty." #location:market #npc:merchant`
    * Bot: adds the note to the database, and adds the tags.
* **5.9 GM adds a note:**
    * GM: `/gm-note The merchant is a disguised spy. #npc:merchant`
    * Bot: adds the note to the gm database, and updates the core information.
* **5.10 Information retrieval with note integration:**
    * Player: `/ask Tell me about the merchant`
    * Bot: provides information from the documents and relevant player/GM notes, prioritizing GM notes, and excluding any GM only information.

**6. Future Considerations**

* Integration with online character sheets.
* Voice channel integration for voice commands.
* Map and image display.
* Automated campaign summaries.
* Integration with other TTRPG tools.
* System specific plugins.
* A system specific data editor, either in discord or web based.
* Web based user interface.
* Automatic notes taker in voice chat to get verbal context.
* Integration with FoundryVTT.
