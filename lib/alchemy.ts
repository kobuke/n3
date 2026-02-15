import { Network, Alchemy } from "alchemy-sdk";

// Default to Polygon Mainnet. 
// If you are using Amoy, change to Network.MATIC_AMOY or use an env var.
const settings = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.MATIC_MAINNET,
};

const alchemy = new Alchemy(settings);

export async function getNFTsByAlchemy(ownerAddress: string) {
    try {
        // Fetch NFTs for the owner
        // We can also filter by contractAddresses if needed:
        // const nfts = await alchemy.nft.getNftsForOwner(ownerAddress, { contractAddresses: [collectionId] });
        // But since collectionId in Crossmint isn't always the contract address, we fetch all and filter in app.
        const nfts = await alchemy.nft.getNftsForOwner(ownerAddress);
        return nfts.ownedNfts;
    } catch (error) {
        console.error("Alchemy/getNFTs error:", error);
        throw error;
    }
}

export async function getNFTMetadata(contractAddress: string, tokenId: string) {
    try {
        const nft = await alchemy.nft.getNftMetadata(contractAddress, tokenId);
        return nft;
    } catch (error) {
        console.error("Alchemy/getNFTMetadata error:", error);
        throw error;
    }
}
export const getNFTsForOwner = getNFTsByAlchemy;
