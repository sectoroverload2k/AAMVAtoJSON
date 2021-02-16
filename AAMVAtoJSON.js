function AAMVAtoJSON(data, options = { format: "json" } ) {
    // Detect AAMVA header:
    //   1. First two characters: "@\n"
    //   2. Third character should be 0x1e but we ignore because of South Carolina 0x1c edge condition
    //   3. Next 5 characters either "ANSI " or "AAMVA"
    //   4. Next 12 characters: IIN, AAMVAVersion, JurisdictionVersion, numberOfEntries

		let readable_mapping = {
			"DCA": "Jurisdiction-specific vehicle class",
			"DCB": "Jurisdiction-specific restriction codes",
			"DCD": "Jurisdiction-specific endorsement codes",
			"DBA": "Document Expiration Date",
			"DCS": "Customer Family Name",
			"DAC": "Customer First Name",
			"DAD": "Customer Middle Name(s)",
			"DBD": "Document Issue Date",
			"DBB": "Date of Birth",
			"DBC": "Physical Description - Sex",
			"DAY": "Physical Description - Eye Color",
			"DAU": "Physical Description - Height",
			"DAG": "Address - Street 1",
			"DAI": "Address - City",
			"DAJ": "Address - Jurisdiction Code",
			"DAK": "Address - Postal Code",
			"DAQ": "Customer ID Number",
			"DCF": "Document Discriminator",
			"DCG": "Country Identification",
			"DDE": "Family name truncation",
			"DDF": "First name truncation",
			"DDG": "Middle name truncation",
			"DAH": "Address - Street 2",
			"DAZ": "Hair color",
			"DCI": "Place of birth",
			"DCJ": "Audit information",
			"DCK": "Inventory control number",
			"DBN": "Alias / AKA Family Name",
			"DBG": "Alias / AKA Given Name",
			"DBS": "Alias / AKA Suffix Name",
			"DCU": "Name Suffix",
			"DCE": "Physical Description - Weight Range",
			"DCL": "Race / ethnicity",
			"DCM": "Standard vehicle classification",
			
		};
		let code_mapping = {
//			"DCA": "Jurisdiction-specific vehicle class",
//			"DCB": "Jurisdiction-specific restriction codes",
//			"DCD": "Jurisdiction-specific endorsement codes",
			"DBA": "document_expiration_date",
			"DCS": "customer_family_name",
			"DAC": "customer_first_name",
			"DAD": "customer_middle_names",
			"DBD": "document_issue_date",
			"DBB": "date_of_birth",
			"DBC": "gender",
			"DAY": "eye_color",
			"DAU": "height",
			"DAG": "address_street_1",
			"DAI": "address_city",
			"DAJ": "address_jurisdiction_code",
			"DAK": "address_postal_code",
			"DAQ": "customer_id_number",
//			"DCF": "Document Discriminator",
			"DCG": "country",
			"DDE": "family_name_truncation",
			"DDF": "first_name_truncation",
			"DDG": "middle_name_truncation",
			"DAH": "address_street_2",
			"DAZ": "hair_color",
			"DCI": "place_of_birth",
//			"DCJ": "Audit information",
//			"DCK": "Inventory control number",
//			"DBN": "Alias / AKA Family Name",
//			"DBG": "Alias / AKA Given Name",
//			"DBS": "Alias / AKA Suffix Name",
			"DCU": "name_suffix",
//			"DCE": "Physical Description - Weight Range",
			"DCL": "race_ethnicity",
//			"DCM": "Standard vehicle classification",
			
		};

//use DKC if customer_id_number is undefined


    let [ header, AAMVAType, IIN, AAMVAVersion, jurisdictionVersion, numberOfEntries ]
        = data.match(/^(@\n(\n)?)(ANSI |AAMVA)(\d{6})(\d{2})(\d{2})(\d{2})?/) || [ ];
    AAMVAVersion = +AAMVAVersion;
    jurisdictionVersion = +jurisdictionVersion;

    let obj = {
        header: {
            AAMVAType: AAMVAType,
            IIN: IIN,
            AAMVAVersion: AAMVAVersion,
            jurisdictionVersion: jurisdictionVersion
        },
				readable: {},
				data: {}
    };

    for (let i = 0; !numberOfEntries || i < numberOfEntries; i++) {
        const entryOffset = header.length + i * 10;
        let [ , subfileType, offset, length ]
            = data.substring(entryOffset, entryOffset + 10).match(/(.{2})(\d{4})(\d{4})/) || [ ];
        if (!subfileType) break;
        offset = +offset;
        length = +length;
        if (i === 0) obj.files = [ ];
        obj.files.push(subfileType);
        obj[subfileType] = data.substring(offset + 2, offset + length).trim().split(/\n\r?/).reduce((p, c) => {
            p[c.substring(0,3)] = c.substring(3);
            return p;
        }, { } );
    }

    // Convert date string (in local timezone) into Javascript UTC time
    function convertAAMVADate(str, country) {
        function convertMMDDCCYY(str) {
            const [ __str, month, day, year ] = str.match(/(\d{2})(\d{2})(\d{4})/) || [ ];
            if (!__str) return null;
            return new Date(year, month-1, day);
        }
        function convertCCYYMMDD(str) {
            const [ __str, year, month, day ] = str.match(/(\d{4})(\d{2})(\d{2})/) || [ ];
            if (!__str) return null;
            return new Date(year, month-1, day);
        }
        switch (country) {
					case "USA": return convertMMDDCCYY(str);
					case "CAN": return convertCCYYMMDD(str);
					default: return str;
        }
    } 
    
    if (obj.DL) {
        for (let k of ["DBA", "DBB", "DBD", "DDB", "DDC", "DDH", "DDI", "DDJ"]) {
            if (!obj.DL[k]) continue;
            const t = convertAAMVADate(obj.DL[k], obj.DL.DCG);
            if (!t) continue;
            obj.DL[k] = t;
        }
    }

		for ( var k in readable_mapping ) {
			var description = readable_mapping[k];
			if ( obj.DL[k] ) {
				obj.readable[ description ] = obj.DL[k];
			}
		}

		for ( var k in code_mapping ) {
			var description = code_mapping[k];
			if ( obj.DL[k] ) {
				obj.data[ description ] = obj.DL[k];
			}
		}



    
    if (options && options.format === "string") {
        return JSON.stringify(obj.data);
    }

		

    return obj.data;
}
