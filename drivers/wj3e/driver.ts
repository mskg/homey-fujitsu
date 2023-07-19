import Homey from 'homey';
import { getStatus } from './api';

class MyDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');
  }

  async onPairListDevices() {
    return [];
  }

  async onPair(session: any) {
    var devices: any = [];

    // this is called when the user presses save settings button in start.html
    session.setHandler("get_devices", async (data: any, callback: any) => {
      this.log("Data", data, "Devices", devices);

      try {
        const result = await getStatus(data.ip, data.mac);
        this.log("Status is", result);

        if (result.result != "OK") {
          session.emit("not_found", null);
        } else {

          devices = [{
            name: data.mac,
            settings: { ip: data.ip },
            data: {
              id: data.mac,
            },
          }];

          // ready to continue pairing
          session.emit("found", null);
        }
      }
      catch (e) {
        this.log(e);
        session.emit("not_found", null);
      }
    });

    // this method is run when Homey.emit('list_devices') is run on the front-end
    // which happens when you use the template `list_devices`
    // pairing: start.html -> get_devices -> list_devices -> add_devices
    session.setHandler("list_devices", (data: any, callback: any) => {
      this.log("Data", data, "Devices", devices);
      return devices;
    });
  };

}

module.exports = MyDriver;
