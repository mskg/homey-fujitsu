//@ts-ignore
import fetch from 'node-fetch';

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
    const request = {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    };

    const url = `http://${host}/${operation}`;
    console.log("Sending", url, body);

    const fetchResponse = await fetch(url, request);
    const data = await fetchResponse.json();

    return data as T;
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
        "ou_low_noise": StringBoolean
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
                "ou_low_noise"
            ]
        });
}