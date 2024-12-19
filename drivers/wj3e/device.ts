import Homey from 'homey';
import { getStatus, sendCommand } from './api';

const OnOffFields: { [details: string]: string } = {
  'fujitsu_economy': 'iu_economy',
  'fujitsu_fan_ctrl': 'iu_fan_ctrl',
  'fujitsu_low_noise': 'ou_low_noise',
  'fujitsu_powerful': 'iu_powerful',
  'fujitsu_swing_vertical': 'iu_af_swg_vrt'
}

class MyDevice extends Homey.Device {
  refreshInterval: NodeJS.Timeout | string | number | undefined;

  connectedTrigger!: Homey.FlowCardTriggerDevice;
  disconnectedTrigger!: Homey.FlowCardTriggerDevice;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Init');

    // default capability, has workflows
    this.registerCapabilityListener('onoff', this.createOnOff('iu_onoff').bind(this));

    Object.keys(OnOffFields).forEach((capability) => {
      this.registerCapabilityListener(capability, this.createOnOff(OnOffFields[capability]).bind(this));

      this.homey.flow.getActionCard(`${capability}_true`).registerRunListener(
        async (_args, _state) => this.sendBooleanCommand(OnOffFields[capability], true),
      );

      this.homey.flow.getActionCard(`${capability}_false`).registerRunListener(
        async (_args, _state) => this.sendBooleanCommand(OnOffFields[capability], false),
      );
    });

    this.registerCapabilityListener('fujitsu_airflow_vertical', this.createAny('iu_af_dir_vrt').bind(this));
    this.homey.flow
      .getActionCard('fujitsu_airflow_vertical')
      .registerRunListener(
        async (args, _state) => this.sendAnyCommand('iu_af_dir_vrt', args.mode)
      );

    this.registerCapabilityListener('fujitsu_operation_mode', this.createAny('iu_op_mode').bind(this));
    this.homey.flow
      .getActionCard('fujitsu_operation_mode')
      .registerRunListener(
        async (args, _state) => this.sendAnyCommand('iu_op_mode', args.mode)
      );

    this.registerCapabilityListener('fujitsu_fan_speed', this.createAny('iu_fan_spd').bind(this));
    this.homey.flow
      .getActionCard('fujitsu_fan_speed')
      .registerRunListener(
        async (args, _state) => this.sendAnyCommand('iu_fan_spd', args.mode)
      );

    this.registerCapabilityListener('target_temperature', this.onTargetTemperature.bind(this));

    this.connectedTrigger = this.homey.flow.getDeviceTriggerCard('fujitsu_connected_true');
    this.disconnectedTrigger = this.homey.flow.getDeviceTriggerCard('fujitsu_connected_false');

    await this.refreshStatus();
    this.registerStatusRefresh();
  }

  registerStatusRefresh() {
    const settings = this.getSettings();
    this.log('Settings are', settings);

    clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(
      this.refreshStatus.bind(this), 
      (parseInt(settings.interval) || 60) * 1000
    );
  }

  async refreshStatus() {
    const settings = this.getSettings();
    const data = this.getData();

    let connected = false;

    try {
      const status = await getStatus(settings.ip, data.id);
      this.log('Received status', status);

      // this.setAvailable();
      this.setCapabilityValue('onoff', status.value.iu_onoff == '1');

      this.setCapabilityValue('fujitsu_economy', status.value.iu_economy == '1');
      this.setCapabilityValue('fujitsu_fan_ctrl', status.value.iu_fan_ctrl == '1');
      this.setCapabilityValue('fujitsu_low_noise', status.value.ou_low_noise == '1');
      this.setCapabilityValue('fujitsu_powerful', status.value.iu_powerful == '1');

      this.setCapabilityValue('fujitsu_swing_vertical', status.value.iu_af_swg_vrt == '1');
      this.setCapabilityValue('fujitsu_airflow_vertical', status.value.iu_af_dir_vrt);

      this.setCapabilityValue('fujitsu_operation_mode', status.value.iu_op_mode);
      this.setCapabilityValue('fujitsu_fan_speed', status.value.iu_fan_spd);

      // outside temperature
      this.setCapabilityValue('measure_temperature', (((parseFloat(status.value.iu_indoor_tmp) / 100) - 32) * 5 / 9));
      this.setCapabilityValue('fujitsu_outdoor_tmp', (((parseFloat(status.value.iu_outdoor_tmp) / 100) - 32) * 5 / 9));

      const target_temperature = (parseFloat(status.value.iu_set_tmp) / 10);
      this.setCapabilityValue('target_temperature', target_temperature > 50 ? 0 : target_temperature);

      connected = true;
    }
    catch (e) {
      connected = false;

      // this.setUnavailable();
      this.error(e);
    }

    if (this.getCapabilityValue('fujitsu_connected') !== connected) {
      this.setCapabilityValue("fujitsu_connected", connected);

      // inverted now
      if (connected) {
        await this.connectedTrigger.trigger(this);
      } else {
        await this.disconnectedTrigger.trigger(this);
      }
    }
  }

  async onTargetTemperature(value: number, _opts: any) {
    const settings = this.getSettings();
    const data = this.getData();

    try {
      const result = await sendCommand(settings.ip, data.id, {
        'iu_set_tmp': (value * 10).toString(),
      });

      if (result?.result != 'OK') {
        console.error('failed', result);
      }
    }
    catch (e) {
      this.error(e);
    }
  }

  async sendAnyCommand(setting: string, value: any) {
    const settings = this.getSettings();
    const data = this.getData();

    try {
      const result = await sendCommand(settings.ip, data.id, {
        [setting]: value
      });

      if (result?.result != 'OK') {
        console.error('failed to set', setting, result);
      }
    }
    catch (e) {
      this.error(e);
    }
  }

  createAny(setting: string) {
    return async (value: any, _opts: any) => {
      await this.sendAnyCommand(setting, value);
    }
  }

  async sendBooleanCommand(setting: string, value: boolean) {
    await this.sendAnyCommand(setting, value ? '1' : '0');
  }

  createOnOff(setting: string) {
    return async (value: boolean, _opts: any) => {
      await this.sendBooleanCommand(setting, value);
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
