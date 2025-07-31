const MatroskaColour =  {
      MatrixCoefficients: {
        0: "Identity",
        1: "ITU-R BT.709",
        2: "Unspecified",
        3: "Reserved",
        4: "US FCC 73.682",
        5: "ITU-R BT.470BG",
        6: "SMPTE 170M",
        7: "SMPTE 240M",
        8: "YCoCg",
        9: "BT2020 Non-constant Luminance",
        10: "BT2020 Constant Luminance",
        11: "SMPTE ST 2085",
        12: "Chroma-derived Non-constant Luminance",
        13: "Chroma-derived Constant Luminance",
        14: "ITU-R BT.2100-0"
      },
      BitsPerChannel: {
        0: "Unspecified"
      },
      ChromaSubsamplingHorz: {
        1: "For video with 4:2:0 chroma subsampling, the ChromaSubsamplingHorz SHOULD be set to 1"
      },
      ChromaSubsamplingVert: {
        1: "For video with 4:2:0 chroma subsampling, the ChromaSubsamplingVert SHOULD be set to 1"
      },
      CbSubsamplingHorz: {
        1: "For video with 4:2:1 chroma subsampling, the CbSubsamplingHorz SHOULD be set to 1"
      },
      CbSubsamplingVert: {},
      ChromaSitingHorz: {
        0: "Unspecified",
        1: "Left collocated",
        2: "Half"
      },
      ChromaSitingVert: {
        0: "Unspecified",
        1: "Top collocated",
        2: "Half"
      },
      Range: {
        0: "Unspecified",
        1: "Broadcast range",
        2: "Full range (no clipping)",
        3: "Defined by MatrixCoefficients / TransferCharacteristics"
      },
      TransferCharacteristics: {
        0: "Reserved",
        1: "ITU-R BT.709",
        2: "Unspecified",
        3: "Reserved2",
        4: "Gamma 2.2 curve - BT.470M",
        5: "Gamma 2.8 curve - BT.470BG",
        6: "SMPTE 170M",
        7: "SMPTE 240M",
        8: "Linear",
        9: "Log",
        10: "Log Sqrt",
        11: "IEC 61966-2-4",
        12: "ITU-R BT.1361 Extended Colour Gamut",
        13: "IEC 61966-2-1",
        14: "ITU-R BT.2020 10 bit",
        15: "ITU-R BT.2020 12 bit",
        16: "ITU-R BT.2100 Perceptual Quantization",
        17: "SMPTE ST 428-1",
        18: "ARIB STD-B67 (HLG)"
      },
      Primaries: {
        0: "Reserved",
        1: "ITU-R BT.709",
        2: "Unspecified",
        3: "Reserved2",
        4: "ITU-R BT.470M",
        5: "ITU-R BT.470BG - BT.601 625",
        6: "ITU-R BT.601 525 - SMPTE 170M",
        7: "SMPTE 240M",
        8: "Film",
        9: "ITU-R BT.2020",
        10: "SMPTE ST 428-1",
        11: "SMPTE RP 432-2",
        12: "SMPTE EG 432-2",
        22: "EBU Tech. 3213-E - JEDEC P22 phosphors"
      },
      MaxCLL: {
        description: "Maximum brightness of a single pixel (Maximum Content Light Level) in candelas per square meter (cd/m^2^)."
      },
      MaxFALL: {
        description: "Maximum brightness of a single full frame (Maximum Frame-Average Light Level) in candelas per square meter (cd/m^2^)."
      },
      MasteringMetadata: {
        description: "SMPTE 2086 mastering data."
      }
};

export default MatroskaColour;