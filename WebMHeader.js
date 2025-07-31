export default class WebmHeader {
    static parse = async (buffer) => {
        return new WebmHeader(buffer);
    }

    /**
     * @type {ArrayBuffer}
     */
    content;

    constructor(content) {
        this.content = content;
        this.get_ebml();
    }

    elementId = 0;
    get_ebml() {
        const dataView = new DataView(this.content);
        this.__bytes_readed = 0;

        this.get_ebml_validation(dataView);
        this.get_ebml_headers(dataView);
        this.get_ebml_body(dataView);
    }

    get_ebml_validation(dataView) {
        // Leer el primer byte (ID EBML: 0x1A45DFA3)
        const header = this.readVint(dataView, this.__bytes_readed);
        this.headerId = header.id;
        this.__bytes_readed += header.bytes;

        if (this.headerId !== 0x1A45DFA3) {
            throw new Error("No es un archivo WebM válido.");
        }

        const size = this.readVint(dataView, this.__bytes_readed);
        this.headerSize = size.value;
        this.__bytes_readed += size.bytes;
    }

    get_ebml_headers(dataView) {
        const start = this.__bytes_readed;
        // Recorrer los elementos del EBML
        while (this.__bytes_readed < start + this.headerSize) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
            
            switch (element.id) {
                case 0x4286: { // EBMLVersion
                    this.EbmlVersion = dataView.getUint8(this.__bytes_readed);
                    this.__bytes_readed++;
                    break;
                }
                case 0x42F7: { // EBMLReadVersion
                    this.EbmlReadVersion = dataView.getUint8(this.__bytes_readed);
                    this.__bytes_readed++;
                    break;
                }
                case 0x42F2: { // EBMLMaxIDLength
                    this.EbmlMaxIDLength = dataView.getUint8(this.__bytes_readed);
                    this.__bytes_readed++;
                    break;
                }
                case 0x42F3: { // EBMLMaxSizeLength
                    this.EbmlMaxSizeLength = dataView.getUint8(this.__bytes_readed);
                    this.__bytes_readed++;
                    break;
                }
                case 0x4282: { // DocType
                    this.docType = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x4287: { // DocTypeVersion
                    this.docTypeVersion = dataView.getUint8(this.__bytes_readed);
                    this.__bytes_readed++;
                    break;
                }
                case 0x4285: { // DocTypeReadVersion
                    this.docTypeReadVersion = dataView.getUint8(this.__bytes_readed);
                    this.__bytes_readed++;
                    break;
                }
            }
        }
    }

    get_ebml_body(dataView) {
        const element = this.readVint(dataView, this.__bytes_readed);
        this.__bytes_readed += element.bytes;

        const size = this.readVint(dataView, this.__bytes_readed);
        this.__bytes_readed += size.bytes;

        if(element.id !== 0x18538067) { // Segmento
            throw new Error("No es un archivo WebM válido, error al leer segmento (ver especificación de Matroska).");
        }

        this.SegmentStart = this.__bytes_readed;
        this.SegmentLength = size.value;
        this.FileTotalBytes = this.__bytes_readed + size.value;
        this.get_matroska_segment(dataView);
    }

    get_matroska_segment(dataView) {
        while (this.__bytes_readed < dataView.byteLength) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;

            switch (element.id) {
                case 0x114D9B74: { // Seek, indicadores de los objetos contenidos
                    this.get_matroska_meta_seek_info(dataView, size.value);
                    break;
                }
                case 0x1549A966: { // Segmento de información
                    this.get_matroska_segment_info(dataView, size.value);
                    break;
                }
                case 0x1654ae6b: { // Tracks
                    this.get_matroska_tracks(dataView, size.value);
                    break;
                }
                case 0x1254c367: { // Taggings, descripción de metadatos de tracks, edición, capítulos, etc
                    this.get_matroska_taggings(dataView, size.value);
                    break;
                }
                case 0x1c53bb6b: { // Cues, permite obtener datos sobre la velocidad de acceso a los tracks si no se transmite vía streaming
                    break;
                }
                case 0xEC: {
                    this.__bytes_readed += size.value;
                    break;
                }
            }
        }
    }
    
    seeks = [];
    __current_read_seek = null;
    get_matroska_meta_seek_info(dataView, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del SeekHead
    
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
    
            switch (element.id) {
                case 0x4DBB: { // Seek
                    this.seeks.push({});
                    this.__current_read_seek = this.__current_read_seek === null ? 0 : this.__current_read_seek + 1;
                    this.get_matroska_seek_entry(dataView, size.value);
                    break;
                }
            }
        }
    }
    
    get_matroska_seek_entry(dataView, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del SeekEntry
    
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
    
            switch (element.id) {
                case 0x53AB: { // SeekID
                    this.seeks[this.__current_read_seek].id = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x53AC: { // SeekPosition
                    this.seeks[this.__current_read_seek].position = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x4dbb: {
                    this.__bytes_readed -= (element.bytes + size.bytes);
                    return;
                }
            }
        }
    }

    get_matroska_segment_info(dataView, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del Segmento de información
    
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;

            switch (element.id) {
                case 0x73A4: { // SegmentUUID
                    this.UUID = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x7384: { // SegmentFilename
                    this.segmentFilename = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x3CB923: { // PrevUUID
                    this.prevUUID = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x3C83AB: { // PrevFilename
                    this.prevFilename = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x3EB923: { // NextUUID
                    this.nextUUID = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x3E83BB: { // NextFilename
                    this.nextFilename = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x4444: { // SegmentFamily
                    this.segmentFamily = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x6924: { // ChapterTranslate
                    this.__bytes_readed += size.value; // Puede contener subelementos
                    break;
                }
                case 0x69A5: { // ChapterTranslateID
                    this.chapterTranslateID = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x69BF: { // ChapterTranslateCodec
                    this.chapterTranslateCodec = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x69FC: { // ChapterTranslateEditionUID
                    this.chapterTranslateEditionUID = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x2AD7B1: { // TimecodeScale
                    this.timecodeScale = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x4489: { // Duration
                    this.duration = this.readFloat(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x4461: { // DateUTC
                    this.dateUTC = new Date(this.readUint(dataView, size.value));
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x7BA9: { // Title
                    this.title = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x4D80: { // MuxingApp
                    this.muxingApp = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x5741: { // WritingApp
                    this.writingApp = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
            }            
        }
    }

    tracks = [];
    __current_read_track = null;
    get_matroska_tracks(dataView, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del segmento de Tracks
    
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
    
            switch (element.id) {
                case 0xAE: { // TrackEntry
                    this.tracks.push({});
                    this.__current_read_track = this.__current_read_track === null ? 0 : this.__current_read_track + 1;
                    break;
                }
                case 0xD7: { // TrackNumber
                    this.tracks[this.__current_read_track].trackNumber = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x73C5: { // TrackUID
                    this.tracks[this.__current_read_track].trackUID = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x83: { // TrackType
                    this.tracks[this.__current_read_track].trackType = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0xB9: { // FlagEnabled
                    this.tracks[this.__current_read_track].flagEnabled = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x88: { // FlagDefault
                    this.tracks[this.__current_read_track].flagDefault = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55AA: { // FlagForced
                    this.tracks[this.__current_read_track].flagForced = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55AB: { // FlagHearingImpaired
                    this.tracks[this.__current_read_track].flagHearingImpaired = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55AC: { // FlagVisualImpaired
                    this.tracks[this.__current_read_track].flagVisualImpaired = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55AD: { // FlagTextDescriptions
                    this.tracks[this.__current_read_track].flagTextDescriptions = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55AE: { // FlagOriginal
                    this.tracks[this.__current_read_track].flagOriginal = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55AF: { // FlagCommentary
                    this.tracks[this.__current_read_track].flagCommentary = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x9C: { // FlagLacing
                    this.tracks[this.__current_read_track].flagLacing = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x23E383: { // DefaultDuration
                    this.tracks[this.__current_read_track].defaultDuration = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x234E7A: { // DefaultDecodedFieldDuration
                    this.tracks[this.__current_read_track].defaultDecodedFieldDuration = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x23314F: { // TrackTimestampScale
                    this.tracks[this.__current_read_track].trackTimestampScale = this.readFloat(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x537F: { // Track__bytes_readed
                    this.tracks[this.__current_read_track].track__bytes_readed = this.readInt(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55EE: { // MaxBlockAdditionID
                    this.tracks[this.__current_read_track].maxBlockAdditionID = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x41E4: { // BlockAdditionMapping
                    this.get_matroska_block_addition_mapping(dataView, size.value);
                    break;
                }
                case 0x536E: { // Name
                    this.tracks[this.__current_read_track].name = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x22B59C: { // Language (Matroska form)
                    this.tracks[this.__current_read_track].language = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x22B59D: { // LanguageBCP47
                    this.tracks[this.__current_read_track].languageBCP47 = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x86: { // CodecID
                    this.tracks[this.__current_read_track].codecID = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x63A2: { // CodecPrivate
                    this.tracks[this.__current_read_track].codecPrivate = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x258688: { // CodecName
                    this.tracks[this.__current_read_track].codecName = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x56AA: { // CodecDelay
                    this.tracks[this.__current_read_track].codecDelay = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x56BB: { // SeekPreRoll
                    this.tracks[this.__current_read_track].seekPreRoll = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x6624: { // TrackTranslate
                    this.get_matroska_track_translate(dataView, size.value);
                    break;
                }
                case 0x66A5: { // TrackTranslateTrackID
                    this.tracks[this.__current_read_track].trackTranslateTrackID = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x66BF: { // TrackTranslateCodec
                    this.tracks[this.__current_read_track].trackTranslateCodec = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x66FC: { // TrackTranslateEditionUID
                    this.tracks[this.__current_read_track].trackTranslateEditionUID = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0xE0: { // Video
                    this.get_matroska_video(dataView, size.value);
                    break;
                }
                case 0xE1: { // Audio
                    this.get_matroska_audio(dataView, size.value);
                    break;
                }
                default: {
                    console.warn(`Elemento desconocido en TrackEntry: id ${element.id.toString(16)}, tamaño: ${size.value}`);
                    this.__bytes_readed += size.value; // Saltar el elemento desconocido
                    break;
                }
            }
        }
    }

    get_matroska_block_addition_mapping(data, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del segmento de Block addition mapping
        this.tracks[this.__current_read_track].block = {};
    
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
    
            switch (element.id) {
                case 0x41F0: { // BlockAddIDValue
                    this.tracks[this.__current_read_track].block.BlockAddIDValue = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x41A4: { // BlockAddIDName
                    this.tracks[this.__current_read_track].block.BlockAddIDName = this.readAsciiString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x41E7: { // BlockAddIDType
                    this.tracks[this.__current_read_track].block.BlockAddIDType = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x41ED: { // BlockAddIDExtraData
                    this.tracks[this.__current_read_track].block.BlockAddIDExtraData = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
            }
        }
    }

    get_matroska_track_translate(data, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del segmento de Track Translate
        this.tracks[this.__current_read_track].translate = {};
    
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
    
            switch (element.id) {
                case 0x66A5: { // TrackTranslateTrackID
                    this.tracks[this.__current_read_track].translate.TrackTranslateTrackID = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x66BF: { // TrackTranslateCodec
                    this.tracks[this.__current_read_track].translate.TrackTranslateCodec = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x66FC: { // TrackTranslateEditionUID	
                    this.tracks[this.__current_read_track].translate.TrackTranslateEditionUID	 = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
            }
        }
    }

    get_matroska_video(dataView, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del Segmento de Video
        this.tracks[this.__current_read_track].video = {};
        
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
    
            switch (element.id) {
                case 0x9A: { // FlagInterlaced
                    this.tracks[this.__current_read_track].video.flagInterlaced = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x9D: { // FieldOrder
                    this.tracks[this.__current_read_track].video.fieldOrder = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x53B8: { // StereoMode
                    this.tracks[this.__current_read_track].video.stereoMode = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x53C0: { // AlphaMode
                    this.tracks[this.__current_read_track].video.alphaMode = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x53B9: { // OldStereoMode
                    this.tracks[this.__current_read_track].video.oldStereoMode = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0xB0: { // PixelWidth
                    this.tracks[this.__current_read_track].video.pixelWidth = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0xBA: { // PixelHeight
                    this.tracks[this.__current_read_track].video.pixelHeight = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x54AA: { // PixelCropBottom
                    this.tracks[this.__current_read_track].video.pixelCropBottom = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x54BB: { // PixelCropTop
                    this.tracks[this.__current_read_track].video.pixelCropTop = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x54CC: { // PixelCropLeft
                    this.tracks[this.__current_read_track].video.pixelCropLeft = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x54DD: { // PixelCropRight
                    this.tracks[this.__current_read_track].video.pixelCropRight = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x54B0: { // DisplayWidth
                    this.tracks[this.__current_read_track].video.displayWidth = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x54BA: { // DisplayHeight
                    this.tracks[this.__current_read_track].video.displayHeight = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x54B2: { // DisplayUnit
                    this.tracks[this.__current_read_track].video.displayUnit = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x54B3: { // AspectRatioType
                    this.tracks[this.__current_read_track].video.aspectRatioType = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x2EB524: { // UncompressedFourCC
                    this.tracks[this.__current_read_track].video.uncompressedFourCC = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x2FB523: { // GammaValue
                    this.tracks[this.__current_read_track].video.gammaValue = this.readFloat(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x2383E3: { // FrameRate
                    this.tracks[this.__current_read_track].video.frameRate = this.readFloat(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55B0: { // Colour
                    this.get_matroska_colour(dataView, size.value);
                    break;
                }
                default: {
                    console.warn(`Elemento desconocido en Video: id 0x${element.id.toString(16)}, tamaño: ${size.value}`);
                    this.__bytes_readed += size.value; // Saltar el elemento desconocido
                    break;
                }
            }
        }
    }

    get_matroska_colour(dataView, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del Segmento de Video
        this.tracks[this.__current_read_track].video.colour = {};
        
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
    
            switch (element.id) {
                case 0x55B1: { // MatrixCoefficients
                    this.tracks[this.__current_read_track].video.colour.MatrixCoefficients = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55B2: { // BitsPerChannel
                    this.tracks[this.__current_read_track].video.colour.BitsPerChannel = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55B3: { // ChromaSubsamplingHorz
                    this.tracks[this.__current_read_track].video.colour.ChromaSubsamplingHorz = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55B4: { // ChromaSubsamplingVert
                    this.tracks[this.__current_read_track].video.colour.ChromaSubsamplingVert = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55B5: { // CbSubsamplingHorz
                    this.tracks[this.__current_read_track].video.colour.CbSubsamplingHorz = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55B6: { // CbSubsamplingVert
                    this.tracks[this.__current_read_track].video.colour.CbSubsamplingVert = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55B7: { // ChromaSitingHorz
                    this.tracks[this.__current_read_track].video.colour.ChromaSitingHorz = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55B8: { // ChromaSitingVert
                    this.tracks[this.__current_read_track].video.colour.ChromaSitingVert = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55B9: { // Range
                    this.tracks[this.__current_read_track].video.colour.Range = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55BA: { // TransferCharacteristics
                    this.tracks[this.__current_read_track].video.colour.TransferCharacteristics = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55BB: { // Primaries
                    this.tracks[this.__current_read_track].video.colour.Primaries = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55BC: { // MaxCLL
                    this.tracks[this.__current_read_track].video.colour.MaxCLL = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55BD: { // MaxFALL
                    this.tracks[this.__current_read_track].video.colour.MaxFALL = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x55D0: { // MasteringMetadata
                    this.tracks[this.__current_read_track].video.colour.MasteringMetadata = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
            }
        }
    }

    taggings = [];
    __current_read_tagging = null;
    __current_read_tag_target = null;
    __current_read_simple_tag = null;
    get_matroska_taggings(dataView, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del Segmento de Video
        
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
    
            switch (element.id) {
                case 0x7373: { // Tag
                    this.taggings.push({});
                    this.__current_read_tagging = this.__current_read_tagging === null ? 0 : this.__current_read_tagging + 1;
                    this.taggings[this.__current_read_tagging].tag_target = [];
                    this.__current_read_tag_target = 0;
                    this.taggings[this.__current_read_tagging].simple_tag = [];
                    this.__current_read_simple_tag = 0;
                    break;
                }
                case 0x63C0: { // Targets
                    this.taggings[this.__current_read_tagging].tag_target.push({});
                    this.get_matroska_tag_target(dataView, size.value);
                    this.__current_read_tag_target++;
                    break;
                }
                case 0x67C8: { // SimpleTag
                    this.taggings[this.__current_read_tagging].simple_tag.push({});
                    this.get_matroska_simple_tag(dataView, size.value);
                    this.__current_read_simple_tag++;
                    break;
                }
            }
        }
    }

    get_matroska_tag_target(dataView, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del Segmento de Video
        
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
    
            switch (element.id) {
                case 0x68CA: { // TargetTypeValue
                    this.taggings[this.__current_read_tagging].tag_target[this.__current_read_tag_target].TargetTypeValue = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x63CA: { // TargetType
                    this.taggings[this.__current_read_tagging].tag_target[this.__current_read_tag_target].TargetType = this.readAsciiString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x63C5: { // TagTrackUID
                    this.taggings[this.__current_read_tagging].tag_target[this.__current_read_tag_target].TagTrackUID = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x63C9: { // TagEditionUID
                    this.taggings[this.__current_read_tagging].tag_target[this.__current_read_tag_target].TagEditionUID = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x63C4: { // TagChapterUID
                    this.taggings[this.__current_read_tagging].tag_target[this.__current_read_tag_target].TagChapterUID = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x63C6: { // TagAttachmentUID
                    this.taggings[this.__current_read_tagging].tag_target[this.__current_read_tag_target].TagAttachmentUID = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
            }
        }
    }

    get_matroska_simple_tag(dataView, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del Segmento de Video
        
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;
    
            switch (element.id) {
                case 0x45A3: { // TagName
                    this.taggings[this.__current_read_tagging].simple_tag[this.__current_read_simple_tag].TagName = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x447A: { // TagLanguage
                    this.taggings[this.__current_read_tagging].simple_tag[this.__current_read_simple_tag].TagLanguage = this.readAsciiString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x447B: { // TagLanguageBCP47
                    this.taggings[this.__current_read_tagging].simple_tag[this.__current_read_simple_tag].TagLanguageBCP47 = this.readAsciiString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x4484: { // TagDefaultBogus
                    this.taggings[this.__current_read_tagging].simple_tag[this.__current_read_simple_tag].TagDefaultBogus = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x4487: { // TagString
                    this.taggings[this.__current_read_tagging].simple_tag[this.__current_read_simple_tag].TagString = this.readString(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x4485: { // TagBinary
                    this.taggings[this.__current_read_tagging].simple_tag[this.__current_read_simple_tag].TagBinary = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x67C8: { // SimpleTag
                    this.__bytes_readed -= (element.bytes + size.bytes);
                    return;
                }
            }
        }
    }

    get_matroska_audio(dataView, size) {
        let end__bytes_readed = this.__bytes_readed + size; // Límite del Segmento de Audio
        this.tracks[this.__current_read_track].audio = {};
        
        while (this.__bytes_readed < end__bytes_readed) {
            const element = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += element.bytes;
    
            const size = this.readVint(dataView, this.__bytes_readed);
            this.__bytes_readed += size.bytes;

            switch (element.id) {
                case 0xB5: { // SamplingFrequency
                    this.tracks[this.__current_read_track].audio.SamplingFrequency = this.readFloat(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x78B5: { // OutputSamplingFrequency
                    this.tracks[this.__current_read_track].audio.OutputSamplingFrequency = this.readFloat(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x9F: { // Channels
                    this.tracks[this.__current_read_track].audio.Channels = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x7D7B: { // ChannelPositions
                    this.tracks[this.__current_read_track].audio.ChannelPositions = this.readUint(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x6264: { // BitDepth
                    this.tracks[this.__current_read_track].audio.BitDepth = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
                case 0x52F1: { // Emphasis
                    this.tracks[this.__current_read_track].audio.Emphasis = this.readBytes(dataView, size.value);
                    this.__bytes_readed += size.value;
                    break;
                }
            }
        }
    }

    /**
     * 
     * @param {DataView} dataView 
     * @param {Number} __bytes_readed 
     */
    readVint(dataView, __bytes_readed) {
        let firstByte = dataView.getUint8(__bytes_readed);
        let mask = 0x80;
        let bytes = 1;
    
        while (!(firstByte & mask) && mask > 0) {
            mask >>= 1;
            bytes++;
        }
    
        if (bytes > 8) {
            throw new Error("VINT demasiado grande.");
        }

        let sub = new Uint8Array(dataView.buffer.slice(__bytes_readed, __bytes_readed + bytes));
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
            str += String.fromCharCode(dataView.getUint8(this.__bytes_readed + i));
        }
        return str;
    }

    /**
     * 
     * @param {DataView} dataView 
     * @param {Number} count 
     */
    readAsciiString(dataView, count) {
        return String.fromCharCode(dataView.buffer.slice(this.__bytes_readed, this.__bytes_readed + count));
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
            value += dataView.getUint8(this.__bytes_readed + i);
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
            value += dataView.getUint8(this.__bytes_readed + i);
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
                return dataView.getFloat32(this.__bytes_readed, false); // Big-endian
            case 8:
                return dataView.getFloat64(this.__bytes_readed, false); // Big-endian
            default:
                throw new Error(`Tamaño no válido para readFloat: ${count}`);
        }
    }
}