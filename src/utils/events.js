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

const rpc = "https://ethereum-sepolia-rpc.publicnode.com"
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
                blockNumber: args[2].blockNumber,
                transactionHash: args[2],
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
        const toBlock = await this.provider.getBlockNumber();
        const fromBlock = toBlock - 5000;

        let events = await this.contract.queryFilter("AES_ENCODE_STRING", fromBlock, toBlock);

        events = events.map((event) => {
            return {
                user: event.args[0],
                encodedString: event.args[1],
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp: event.args[2]
            }
        });
        
        this.events = events;
    }

    // contract(){
    //     return this.contract;
    // }

}

export default EventListener;