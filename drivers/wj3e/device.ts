import Homey from 'homey';
import { getStatus, sendCommand } from './api';

class MyDevice extends Homey.Device {
  refreshInterval: NodeJS.Timer | undefined;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Init');

    await this.refreshStatus();
    this.registerStatusRefresh();

    this.registerCapabilityListener('onoff', this.createOnOff("iu_onoff").bind(this));

    this.registerCapabilityListener('fujitsu_economy', this.createOnOff("iu_economy").bind(this));
    this.registerCapabilityListener('fujitsu_fan_ctrl', this.createOnOff("iu_fan_ctrl").bind(this));
    this.registerCapabilityListener('fujitsu_low_noise', this.createOnOff("ou_low_noise").bind(this));
    this.registerCapabilityListener('fujitsu_powerful', this.createOnOff("iu_powerful").bind(this));

    this.registerCapabilityListener('fujitsu_swing_vertical', this.createOnOff("iu_af_swg_vrt").bind(this));
    this.registerCapabilityListener('fujitsu_airflow_vertical', this.createAny("iu_af_dir_vrt").bind(this));

    this.registerCapabilityListener('fujitsu_operation_mode', this.createAny("iu_op_mode").bind(this));
    this.registerCapabilityListener('fujitsu_fan_speed', this.createAny("iu_fan_spd").bind(this));
    
    this.registerCapabilityListener('target_temperature', this.onTargetTemperature.bind(this))
  }

  registerStatusRefresh() {
    const settings = this.getSettings();
    this.log("Settings are", settings);

    clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(this.refreshStatus.bind(this), (parseInt(settings.interval) || 60) * 1000);
  }

  async refreshStatus() {
    const settings = this.getSettings();
    const data = this.getData();

    try {
      const status = await getStatus(settings.ip, data.id);
      this.log("Received status", status);

      this.setAvailable();
      this.setCapabilityValue("onoff", status.value.iu_onoff == "1");

      this.setCapabilityValue("fujitsu_economy", status.value.iu_economy == "1");
      this.setCapabilityValue("fujitsu_fan_ctrl", status.value.iu_fan_ctrl == "1");
      this.setCapabilityValue("fujitsu_low_noise", status.value.ou_low_noise == "1");
      this.setCapabilityValue("fujitsu_powerful", status.value.iu_powerful == "1");
      
      this.setCapabilityValue("fujitsu_swing_vertical", status.value.iu_af_swg_vrt == "1");
      this.setCapabilityValue("fujitsu_airflow_vertical", status.value.iu_af_dir_vrt);

      this.setCapabilityValue("fujitsu_operation_mode", status.value.iu_op_mode);
      this.setCapabilityValue("fujitsu_fan_speed", status.value.iu_fan_spd);

      // outside temperature
      this.setCapabilityValue("measure_temperature", (((parseFloat(status.value.iu_indoor_tmp) / 100) - 32) * 5 / 9));
      this.setCapabilityValue("fujitsu_outdoor_tmp", (((parseFloat(status.value.iu_outdoor_tmp) / 100) - 32) * 5 / 9));
      this.setCapabilityValue("target_temperature", (parseFloat(status.value.iu_set_tmp) / 10));
    }
    catch (e) {
      this.setUnavailable();
      this.error(e);
    }
  }

  async onTargetTemperature(value: number, _opts: any) {
    const settings = this.getSettings();
    const data = this.getData();

    try {
      const result = await sendCommand(settings.ip, data.id, {
        "iu_set_tmp": (value * 10).toString(),
      });

      if (result?.result != "OK") {
        console.error("failed", result);
      }
    }
    catch (e) {
      this.error(e);
    }
  }

  createAny(setting: string) {
    return async (value: any, _opts: any) => {
      const settings = this.getSettings();
      const data = this.getData();

      try {
        const result = await sendCommand(settings.ip, data.id, {
          [setting]: value,
        });

        if (result?.result != "OK") {
          console.error("failed to set", setting, result);
        }
      }
      catch (e) {
        this.error(e);
      }
    }
  }

  createOnOff(setting: string) {
    return async (value: boolean, _opts: any) => {
      const settings = this.getSettings();
      const data = this.getData();

      try {
        const result = await sendCommand(settings.ip, data.id, {
          [setting]: value ? "1" : "0"
        });

        if (result?.result != "OK") {
          console.error("failed to set", setting, result);
        }
      }
      catch (e) {
        this.error(e);
      }
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Added');
    this.registerStatusRefresh();
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    this.registerStatusRefresh();
  }


  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Deleted');
    clearInterval(this.refreshInterval);
  }

}

module.exports = MyDevice;
