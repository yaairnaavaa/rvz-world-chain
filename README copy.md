# Revoluzion 🚀
Welcome to the official repository for Revoluzion, a decentralized mini-app designed for the World Coin network. Our mission is to empower people to create and support social causes through the power of blockchain technology.

🎯 What is Revoluzion?
Revoluzion is a platform that allows users to launch campaigns for social causes, ranging from local community initiatives to global impact movements. Support for these causes is materialized through the acquisition of special edition NFTs called RVZ Tokens. Each token not only represents a contribution but also grants its holders the ability to participate in the governance and key decisions of the cause they support.

We aim to create a transparent, democratic, and efficient ecosystem where social change is driven directly by the community.

✨ Key Features
Cause Creation: Any verified user can propose and launch a campaign for a social cause.

NFT Support: Supporters can back causes by purchasing NFTs (RVZ Tokens), thereby funding their operations and objectives.

Decentralized Governance: RVZ Token holders can vote on important proposals and decisions related to the cause.

Blockchain Transparency: All contributions and expenses are recorded on the blockchain, ensuring full transparency and traceability of funds.

World ID Integration: We leverage World ID's "Proof-of-Personhood" to ensure that each participant is a unique individual, preventing fraud and bots.

🚀 Getting Started
Follow these steps to set up and run the project in your local development environment.

1. Prerequisites
Make sure you have the following installed on your system:

Node.js (version 18.x or higher)

Yarn or npm

2. Clone the Repository
Open your terminal and clone this repository to your local machine.

git clone https://github.com/your-username/revoluzion.git
cd revoluzion

3. Install Dependencies
Install all project dependencies using yarn (recommended) or npm.

yarn install

or

npm install

4. Set Up Environment Variables
For the application to work correctly, you need to configure your environment variables. Create a copy of the .env.example file and rename it to .env.local.

cp .env.example .env.local

Now, open the .env.local file and add the corresponding values.

# RPC provider URL for the blockchain network (e.g., Alchemy, Infura)
NEXT_PUBLIC_RPC_URL="https://mainnet.optimism.io"

# Application ID obtained from the World Coin Developer Portal
NEXT_PUBLIC_WLD_APP_ID="app_..."

# Action for World ID verification
NEXT_PUBLIC_WLD_ACTION="revoluzion_action"

5. Run the Development Server
Once you have configured your environment variables, you can start the development server.

yarn dev

or

npm run dev

That's it! Open http://localhost:3000 in your browser to see the application running.

🤝 How to Contribute
We are open to community contributions! If you want to help improve Revoluzion, please follow these steps:

Fork the repository.

Create a new branch for your feature (git checkout -b feature/new-feature).

Make your changes and commit them (git commit -m 'Add new feature').

Push to your branch (git push origin feature/new-feature).

Open a Pull Request so we can review your changes.

Please ensure your code follows the project's style guides and is well-documented.

📄 License
This project is licensed under the MIT License. See the LICENSE file for more details.

Made with ❤️ by the community for the community.
