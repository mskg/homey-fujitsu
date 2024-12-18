import axios from "axios";

//@ts-ignore
function baseCmd(mac: string, level: "03" | "02") {
    return {
        "device_id": mac,
        "device_sub_id": 0,
        "req_id": "",
        "modified_by": "",
        "set_level": level,
    };
}

async function sendToDevice<T>(host: string, operation: string, body: any): Promise<T> {
    const url = `http://${host}/${operation}`;
    console.log("Sending", url, body);

    const response = await axios.post(
        url, 
        JSON.stringify(body)
    );

    return response.data as T;
}

export async function sendCommand(host: string, mac: string, cmd: any): Promise<any> {
    return await sendToDevice(
        host,
        "SetParam",
        {
            ...baseCmd(mac, "02"),
            value: {
                ...cmd
            }
        });
}

type StringBoolean = "0" | "1";
type Status = {
    value: {
        "iu_set_tmp": string,
        "iu_indoor_tmp": string,
        "iu_outdoor_tmp": string,
        "iu_onoff": StringBoolean,
        "iu_economy": StringBoolean,
        "iu_fan_ctrl": StringBoolean,
        "iu_powerful": StringBoolean,
        "ou_low_noise": StringBoolean,
        "iu_af_swg_vrt": StringBoolean,
        "iu_af_dir_vrt": string,
        "iu_fan_spd": string,
        "iu_min_heat": string,
        "iu_op_mode": string
    },

    "read_res": string,
    "device_id": string,
    "device_sub_id": number,
    "req_id": string,
    "modified_by": string,
    "set_level": string,
    "cause": string,
    "result": string,
    "error": string,
}

export async function getStatus(host: string, mac: string): Promise<Status> {
    return await sendToDevice(
        host,
        "GetParam",
        {
            ...baseCmd(mac, "03"),
            "list": [
                "iu_set_tmp",
                "iu_indoor_tmp",
                "iu_outdoor_tmp",
                "iu_onoff",
                "iu_economy",
                "iu_fan_ctrl",
                "iu_powerful",
                "ou_low_noise",
                "iu_op_mode",
                "iu_min_heat",
                "iu_fan_spd",
                "iu_af_dir_vrt",
                "iu_af_swg_vrt"
            ]
        });
}