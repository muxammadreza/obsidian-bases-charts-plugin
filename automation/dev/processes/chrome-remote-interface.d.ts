declare module 'chrome-remote-interface' {
	type ConnectOptions = {
		host?: string;
		port?: number;
		[key: string]: unknown;
	};

	type ChromeRemoteInterface = (options?: ConnectOptions) => Promise<unknown>;

	const connect: ChromeRemoteInterface;
	export default connect;
}
