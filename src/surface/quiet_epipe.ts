/** Ends the process quietly when a reader closes the pipe early (`| head`). */
export function quietOnClosedPipe(): void {
  for (const stream of [process.stdout, process.stderr])
    stream.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EPIPE") process.exit(process.exitCode ?? 0);
      throw error;
    });
}
