import { ethers } from 'ethers';

const ABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "encodedString",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "AES_ENCODE_STRING",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "plainText",
				"type": "string"
			}
		],
		"name": "encodeString",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]

// const rpc = "https://sepolia.infura.io/v3/e2782bad2d2f4e0fbe8192f3008366c2"
const rpc = process.env.PRC
const contractAddress = "0xDeE868801bcB72446d23b13fA2C9dCf645d2d425"

class EventListener {
    constructor() {
        this.events = [];
        this.contract = null;
        this.provider = null;
        this.init();
    }

    init() {
        this.provider = new ethers.providers.JsonRpcProvider(rpc);
        this.contract = new ethers.Contract(contractAddress, ABI, this.provider);
    }

    on(fn) {
        this.contract.on("AES_ENCODE_STRING", (...args) => {
            const event = {
                user: args[0],
                encodedString: args[1],
                blockNumber: args[3].blockNumber,
                transactionHash: args[3].transactionHash,
                timestamp: args[2].timestamp
            };
    
            fn(event);
        });
    }

    getEvents() {
        return this.events;
    }

    stopListening() {
        this.contract.removeAllListeners("AES_ENCODE_STRING");
    }

    async history() {
        const currentBlock = await this.provider.getBlockNumber();
        const totalBlocksToScan = 500000000;
        const batchSize = 500000000;
        const batches = Math.ceil(totalBlocksToScan / batchSize);
        
        let allEvents = [];
        
        // Add a loading state to the events array
        this.events = [{ loading: true, message: 'Scanning blockchain history...' }];
        
        for (let i = 0; i < batches; i++) {
            const toBlock = currentBlock - (i * batchSize);
            const fromBlock = Math.max(toBlock - batchSize + 1, currentBlock - totalBlocksToScan);
            
            try {
                // Update loading state with progress
                this.events = [{ 
                    loading: true, 
                    message: `Scanning blocks ${fromBlock} to ${toBlock} (${Math.min(i+1, batches)}/${batches})` 
                }];
                
                const batchEvents = await this.contract.queryFilter("AES_ENCODE_STRING", fromBlock, toBlock);
                
                const formattedEvents = batchEvents.map((event) => {
                    return {
                        user: event.args[0],
                        encodedString: event.args[1],
                        blockNumber: event.blockNumber,
                        transactionHash: event.transactionHash,
                        timestamp: event.args[2]
                    };
                });
                
                allEvents = [...allEvents, ...formattedEvents];
            } catch (error) {
                console.error(`Error fetching events for blocks ${fromBlock} to ${toBlock}:`, error);
            }
        }
        
        // Sort all events by block number in descending order
        allEvents.sort((a, b) => b.blockNumber - a.blockNumber);
        
        this.events = allEvents;
    }
}

export default EventListener;