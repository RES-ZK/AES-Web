
import CryptoJS from 'crypto-js';

class AES {
    key;
    iv;

    constructor(wallet, password) {
        this.init(wallet, password);
    }

    init(walletAddr, password) {
        if (!walletAddr || !password) return;
        walletAddr = walletAddr.toLowerCase();

        const key512 = CryptoJS.SHA512(password).toString();
        const iv512 = CryptoJS.SHA512(walletAddr).toString();

        this.key = key512.slice(0, 16);
        this.iv = iv512.slice(0, 16);
    }

    decrypt(ciphertext) {
        const config = {
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
            iv: this.iv
        };
        try {
            const decrypted = CryptoJS.AES.decrypt(ciphertext, this.key, config);
            console.log("decrypted", decrypted.toString(CryptoJS.enc.Utf8))
            return decrypted.toString(CryptoJS.enc.Utf8);
        }
        catch (e) {
            console.log("decrypt error", e);
            return "";
        }
    }


    encrypt(text) {
        const config = {
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
            iv: this.iv
        };

        const encrypted = CryptoJS.AES.encrypt(text, this.key, config);

        return encrypted.toString();
    }

    updateWalletAddrOrPassword(walletAddr, password) {
        this.init(walletAddr, password)
    }
}

export default AES;

// const aesInstant = new AES("0x833Cf4ee8F442Bc1e62619DDb3250518BB72D734", "1234567890")
// const encoded = aesInstant.encrypt("password")
// const decoded = aesInstant.decrypt(encoded)

// console.log("encoded", encoded);
// console.log("decoded", decoded);