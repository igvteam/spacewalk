
class ContactRecord {

    constructor(bin1, bin2, counts) {
        this.bin1 = bin1;
        this.bin2 = bin2;
        this.counts = counts;
    };

    getKey() {
        return `${ this.bin1 }_${ this.bin2 }`
    }

    getReflectedKey() {
        return `${ this.bin2 }_${ this.bin1 }`
    }
}

export default ContactRecord;
