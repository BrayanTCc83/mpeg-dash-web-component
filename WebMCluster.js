export default class WebMCluster {
    static parse(buffer) {
        return new WebMCluster(buffer);
    }

    constructor(buffer) {
        this.content = buffer;
        this.__offset = 0;

        const dataView = new DataView(buffer);
        
        this.validate_matroska_cluster(dataView);
        this.get_matroska_cluster_data(dataView);
        console.log(this);
    }

    /**
     * 
     * @param {DataView} dataView 
     */
    validate_matroska_cluster(dataView) {
        const element = this.readVint(dataView, this.__offset);

        if(element.id !== 0x1F43B675) {
            throw new Error("Elemento cluster inválido.");
        }
        
        this.__offset += element.bytes;
        this.ClusterId = element.id;

        const size = this.readVint(dataView, this.__offset);
        this.__offset += size.bytes;
        this.ClusterSize = size.value;
    }

    blocks = -1;
    SimpleBlocks = [];
    /**
     * 
     * @param {DataView} dataView 
     */
    get_matroska_cluster_data(dataView) {
        let end = this.__offset + this.ClusterSize;
        
        while (this.__offset < end) {
            const element = this.readVint(dataView, this.__offset);
            this.__offset += element.bytes;
    
            const size = this.readVint(dataView, this.__offset);
            this.__offset += size.bytes;
    
            switch (element.id) {
                case 0xE7: { // Timestamp
                    this.Timestamp = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xAB: { // PrevSize
                    this.PrevSize = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xA3: { // SimpleBlock
                    this.SimpleBlocks.push(this.readUint(dataView, size.value));
                    this.__offset += size.value;
                    break;
                }
                case 0xA0: { // BlockGroup
                    this.blocks++;
                    this.BlockGroup.push({});
                    this.get_matroska_block_group(dataView, size.value);
                    break;
                }
            }
        }
    }

    get_matroska_block_group(dataView, size) {
        let end = this.__offset + size;
        let additions = -1;
        this.BlockGroup[this.blocks].BlockAdditions = [];
        
        while (this.__offset < end) {
            const element = this.readVint(dataView, this.__offset);
            this.__offset += element.bytes;
    
            const size = this.readVint(dataView, this.__offset);
            this.__offset += size.bytes;
    
            switch (element.id) {
                case 0xA1: { // Block
                    this.BlockGroup[this.blocks].Block = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0x9B: { // BlockDuration
                    this.BlockGroup[this.blocks].BlockDuration = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xFA: { // ReferencePriority
                    this.BlockGroup[this.blocks].ReferencePriority = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xFB: { // ReferenceBlock
                    this.BlockGroup[this.blocks].ReferenceBlock = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xA4: { // CodecState
                    this.BlockGroup[this.blocks].CodecState = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0x75A2: { // DiscardPadding
                    this.BlockGroup[this.blocks].DiscardPadding = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0x75A1: { // BlockAdditions
                    additions++;
                    this.BlockGroup[this.blocks].BlockAdditions.push({});
                    break;
                }
                case 0xA6: { // BlockMore
                    this.BlockGroup[this.blocks].BlockAdditions[additions].BlockMore = {};
                    this.get_matroska_block_group(dataView, size.value, additions);
                    break;
                }
            }
        }
    }

    get_matroska_block_additional(dataView, size, additions) {
        let end = this.__offset + size;
        
        while (this.__offset < end) {
            const element = this.readVint(dataView, this.__offset);
            this.__offset += element.bytes;
    
            const size = this.readVint(dataView, this.__offset);
            this.__offset += size.bytes;
    
            switch (element.id) {
                case 0xA5: { // BlockAdditional
                    this.BlockGroup[this.blocks].BlockAdditions[additions].BlockMore
                        .BlockAdditional = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xEE: { // BlockAddID
                    this.BlockGroup[this.blocks].BlockAdditions[additions].BlockMore
                        .BlockAddID = this.readUint(dataView, size.value);
                        this.__offset += size.value;
                    break;
                }
            }
        }
    }

    /**
     * 
     * @param {DataView} dataView 
     * @param {Number} __offset 
     */
    readVint(dataView, __offset) {
        let firstByte = dataView.getUint8(__offset);
        let mask = 0x80;
        let bytes = 1;
    
        while (!(firstByte & mask) && mask > 0) {
            mask >>= 1;
            bytes++;
        }
    
        if (bytes > 8) {
            throw new Error("VINT demasiado grande.");
        }

        let sub = new Uint8Array(dataView.buffer.slice(__offset, __offset + bytes));
        let id = 0;
        let value = 0;
        sub.forEach((element, index) => {
            id <<= 8;
            id += element;
            value <<= 8;
            if(index === 0) {
                value += element ^ mask;
            } else {
                value += element;
            }
        });
        if(id < 0){
            id = id >>> 0;
            value = value >>> 0;
        }
        return { id, value, bytes };
    }

    /**
     * 
     * @param {DataView} dataView 
     * @param {Number} count 
     */
    readString(dataView, count) {
        let str = "";
        for (let i = 0; i < count; i++) {
            str += String.fromCharCode(dataView.getUint8(this.__offset + i));
        }
        return str;
    }

    /**
     * 
     * @param {DataView} dataView 
     * @param {Number} count 
     */
    readAsciiString(dataView, count) {
        return String.fromCharCode(dataView.buffer.slice(this.__offset, this.__offset + count));
    }

    /**
     * 
     * @param {DataView} dataView 
     * @param {Number} count 
     */
    readBytes(dataView, count) {
        let value = 0;
        for(let i = 0; i < count; i++) {
            value <<= 8;
            value += dataView.getUint8(this.__offset + i);
        }
        return value;
    }

    /**
     * 
     * @param {DataView} dataView 
     * @param {Number} count 
     */
    readUint(dataView, count) {
        let value = 0;
        for(let i = 0; i < count; i++) {
            value <<= 8;
            value += dataView.getUint8(this.__offset + i);
        }
        return value;
    }
    
    /**
     * 
     * @param {DataView} dataView 
     * @param {Number} count 
     */
    readFloat(dataView, count) {
        switch (count) {
            case 4:
                return dataView.getFloat32(this.__offset, false); // Big-endian
            case 8:
                return dataView.getFloat64(this.__offset, false); // Big-endian
            default:
                throw new Error(`Tamaño no válido para readFloat: ${count}`);
        }
    }
}