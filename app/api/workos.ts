import { WorkOS } from "@workos-inc/node";

let _workos: WorkOS | undefined;

function getWorkOS(): WorkOS {
  if (!_workos) {
    const apiKey = process.env.WORKOS_API_KEY;
    const clientId = process.env.WORKOS_CLIENT_ID;
    _workos = new WorkOS(apiKey, { clientId });
  }
  return _workos;
}

const workos = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getWorkOS();
      return client[prop as keyof WorkOS];
    },
  }
) as WorkOS;

export { workos, getWorkOS };
