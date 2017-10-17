using Microsoft.SfB.PlatformService.SDK.Common;
using System;
using System.Diagnostics;

namespace Microsoft.SfB.PlatformService.SDK.Samples.ApplicationCore
{
    public class ConsoleLogger : IPlatformServiceLogger
    {
        public bool HttpRequestResponseNeedsToBeLogged
        {
            get;
            set;
        }

        public void Information(string message)
        {
            Debug.WriteLine("[INFO]" + message);
        }

        public void Information(string fmt, params object[] vars)
        {
            Debug.WriteLine("[INFO]" + string.Format(fmt, vars));
        }

        public void Information(Exception exception, string fmt, params object[] vars)
        {
            string msg = String.Format(fmt, vars);
            Debug.WriteLine("[INFO]" + msg + "; \r\nException Details= ", ExceptionUtils.FormatException(exception, includeContext: true));
        }



        public void Warning(string message)
        {
            Debug.WriteLine("[WARN]" + message);
        }

        public void Warning(string fmt, params object[] vars)
        {
            Debug.WriteLine("[WARN]" + string.Format(fmt, vars));
        }

        public void Warning(Exception exception, string fmt, params object[] vars)
        {
            string msg = String.Format(fmt, vars);
            Debug.WriteLine(msg + "; \r\nException Details= ", ExceptionUtils.FormatException(exception, includeContext: true));
        }


        public void Error(string message)
        {
            Debug.WriteLine(message);
        }

        public void Error(string fmt, params object[] vars)
        {
            Debug.WriteLine("[ERROR]" + String.Format(fmt, vars));
        }

        public void Error(Exception exception, string fmt, params object[] vars)
        {
            string msg = String.Format(fmt, vars);
            Debug.WriteLine("[ERROR]" + msg + "; \r\nException Details= ", ExceptionUtils.FormatException(exception, includeContext: true));
        }

    }
}
