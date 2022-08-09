import 'core-js/stable';
import 'regenerator-runtime/runtime';

import hljs from 'highlight.js';
import * as sock from 'websocket';
import { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { v4 as uuid } from 'uuid';
import { VscListSelection } from 'react-icons/vsc';
import axios from 'axios';

const getIndicesOf = (sourceStr, searchStr) => {
  const maxMatch = 20;
  let totalMatched = 0;

  if (!searchStr) return null;
  const pat = new RegExp(searchStr, 'gi');
  let found = pat.exec(sourceStr);
  const res = [];
  while (found) {
    totalMatched += 1;
    res.push([found.index, pat.lastIndex]);
    if (pat.lastIndex === sourceStr.length) break;
    found = pat.exec(sourceStr);
    if (totalMatched >= maxMatch) {
      console.log(`more than ${maxMatch} found`);
      break;
    }
  }
  return res;
};

const useSearch = ({ data, searchText }, dependency = []) => {
  return useCallback(() => {
    if (!searchText)
      return data.map((item, index) => ({
        line: item,
        searchInf: {
          match: null,
          idx: index,
        },
      }));
    return data
      .map((item, index) => {
        let sResult;
        try {
          sResult = getIndicesOf(item, searchText);
        } catch (err) {
          console.error(err);
        }
        return {
          line: item,
          searchInf: {
            match: sResult?.length ? sResult : null,
            idx: index,
          },
        };
      })
      .filter((a) => a.searchInf.match);
  }, dependency)();
};

const OPTIONS = {
  root: null,
  rootMargin: '0px 0px 0px 0px',
  threshold: 0,
};

const useIsVisible = (elementRef) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    (async () => {
      if (elementRef.current) {
        const observer = new IntersectionObserver((entries) => {
          // logger.log('changed');
          // setIsVisible(isScrolledIntoView(elementRef.current));
          entries.forEach((entry) => {
            // console.log('changed');
            if (entry.isIntersecting) {
              setIsVisible(true);
            } else {
              setIsVisible(false);
            }
          });
        }, OPTIONS);
        observer.observe(elementRef.current);
      }
    })();
  }, [elementRef?.current]);

  return isVisible;
};

const HighlightJsLog = ({
  websocket = false,
  websocketOptions = {
    formatMessage: null,
  },
  follow = true,
  url = '',
  text = '',
  enableSearch = true,
  selectableLines = true,
  title = '',
  height = '400px',
  width = '600px',
  noScrollBar = false,
  maxLines = null,
  fontSize = 14,
  loadingComponent = null,
  actionComponent = null,
  hideLines = false,
}) => {
  const [data, setData] = useState(text);
  const { formatMessage } = websocketOptions;
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setData(text);
  }, [text]);

  useEffect(() => {
    (async () => {
      if (!url || websocket) return;
      setIsLoading(true);
      try {
        const d = await axios({
          url,
          method: 'GET',
        });
        setData((d.data || '').trim());
      } catch (err) {
        setData(
          `${err.message}
An error occurred attempting to load the provided log.
Please check the URL and ensure it is reachable.
${url}`
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!url || !websocket) return;

    let wsclient;
    setIsLoading(true);
    try {
      wsclient = new sock.w3cwebsocket(url, '', '', {}, null);
    } catch (err) {
      setIsLoading(false);
      setData(
        `${err.message}
An error occurred attempting to load the provided log.
Please check the URL and ensure it is reachable.
${url}`
      );
      return;
    }
    // wsclient.onopen = logger.log;
    // wsclient.onclose = logger.log;
    // wsclient.onerror = logger.log;

    wsclient.onmessage = (msg) => {
      try {
        const m = formatMessage ? formatMessage(msg.data) : msg;
        setData((s) => `${s}${m ? `\n${m}` : ''}`);
        setIsLoading(false);
      } catch (err) {
        console.log(err);
        setData("'Something went wrong! Please try again.'");
      }
    };
  }, []);

  return (
    <div
      className="hljs-logs"
      style={{
        width,
        height,
      }}
    >
      {isLoading ? (
        loadingComponent || (
          <div className="hljs p-2 rounded-md flex flex-col gap-2 items-center justify-center h-full">
            <code className="">
              <HighlightIt inlineData="Loading..." />
            </code>
          </div>
        )
      ) : (
        <LogBlock
          {...{
            data,
            follow,
            enableSearch,
            selectableLines,
            title,
            noScrollBar,
            maxLines,
            fontSize,
            actionComponent,
            width,
            height,
            hideLines,
          }}
        />
      )}
    </div>
  );
};

const HighlightIt = ({
  language = 'accesslog',
  inlineData = '',
  className = '',
}) => {
  const ref = useRef();

  useEffect(() => {
    (async () => {
      if (ref.current) {
        // if (!isScrolledIntoView(ref.current)) return;
        // @ts-ignore
        ref.current.innerHTML = hljs.highlight(
          inlineData,
          {
            language,
          },
          false
        ).value;
      }
    })();
  }, [inlineData, language]);

  return (
    <div ref={ref} className={classNames(className, 'inline')}>
      {inlineData}
    </div>
  );
};

const FilterdHighlightIt = ({
  searchInf = null,
  inlineData = '',
  className = '',
}) => {
  if (!inlineData) {
    inlineData = ' ';
  }
  const [res, setRes] = useState([]);

  useEffect(() => {
    // TODO: multi match
    (async () => {
      if (searchInf?.match) {
        setRes(
          searchInf.match.reduce(
            (acc, curr, index) => {
              return {
                cursor: curr[1],
                res: [
                  ...acc.res,
                  <HighlightIt
                    key={searchInf.idx + inlineData.slice(acc.cursor, curr[0])}
                    // key={uuid()}
                    inlineData={inlineData.slice(acc.cursor, curr[0])}
                    className={className}
                  />,
                  <span
                    // key={searchInf.idx + inlineData.slice(curr[0], curr[1])}
                    key={uuid()}
                    className={classNames(
                      className,
                      'bg-gray-600 text-yellow-400 rounded-sm'
                    )}
                  >
                    {inlineData.slice(curr[0], curr[1])}
                  </span>,
                  ...[
                    index === searchInf.match.length - 1 && curr[1] !== index && (
                      <HighlightIt
                        key={searchInf.idx + inlineData.slice(curr[1])}
                        // key={uuid()}
                        inlineData={inlineData.slice(curr[1])}
                        className={className}
                      />
                    ),
                  ],
                ],
              };
            },
            {
              cursor: 0,
              res: [],
            }
          ).res
        );
      } else {
        setRes([
          <HighlightIt
            key={inlineData}
            inlineData={inlineData}
            className={className}
          />,
        ]);
      }
    })();
  }, [searchInf]);

  return <div className="whitespace-pre">{res}</div>;
};

const padLeadingZeros = (num, size) => {
  let s = `${num}`;
  while (s.length < size) s = `0${s}`;
  return s;
};

const WithSearchHighlightIt = ({
  inlineData = '',
  className = '',
  searchText = '',
}) => {
  const x = useSearch(
    {
      data: [inlineData],
      searchText,
    },
    [inlineData, searchText]
  );

  return (
    <FilterdHighlightIt
      {...{
        inlineData,
        className,
        ...(x.length ? { searchInf: x[0].searchInf } : {}),
      }}
    />
  );
};

const LogLine = ({
  searchInf,
  line,
  fontSize,
  selectableLines,
  showAll,
  searchText,
}) => {
  const ref = useRef();
  const isVisible = useIsVisible(ref);
  return (
    <code
      ref={ref}
      className={classNames(
        'flex gap-4 items-center whitespace-pre border-b border-transparent',
        {
          'hover:bg-gray-800': selectableLines,
        }
      )}
      style={{
        fontSize,
        paddingLeft: fontSize / 2,
        paddingRight: fontSize / 2,
      }}
    >
      {isVisible ? (
        showAll ? (
          <WithSearchHighlightIt
            {...{
              inlineData: line,
              searchText,
            }}
          />
        ) : (
          <FilterdHighlightIt
            {...{
              inlineData: line,
              searchInf,
            }}
          />
        )
      ) : (
        '.'
      )}
    </code>
  );
};

const LineNumber = ({ searchInf, fontSize, lines }) => {
  const ref = useRef();
  const isVisible = useIsVisible(ref);
  const [data, setData] = useState(() =>
    padLeadingZeros(searchInf.idx + 1, `${lines.length}`.length)
  );

  useEffect(() => {
    setData(padLeadingZeros(searchInf.idx + 1, `${lines.length}`.length));
  }, [lines, searchInf]);
  return (
    <code
      key={`ind+${searchInf.idx}`}
      className="flex gap-4 items-center whitespace-pre"
      ref={ref}
    >
      <span className="hljs flex sticky left-0" style={{ fontSize }}>
        {isVisible ? (
          <HighlightIt
            {...{
              inlineData: data,
              language: 'accesslog',
              className: 'bg-gray-800 border-gray-700 border-b px-2',
            }}
          />
        ) : (
          <span className="bg-gray-800 border-gray-700 border-b px-2">
            {data}
          </span>
        )}
        <div className="hljs" style={{ width: fontSize / 2 }} />
      </span>
    </code>
  );
};

const LogBlock = ({
  data = '',
  follow,
  enableSearch,
  selectableLines,
  title,
  noScrollBar,
  maxLines,
  fontSize,
  actionComponent,
  hideLines,
}) => {
  const lines = data.split('\n');

  const [searchText, setSearchText] = useState('');

  const x = useSearch(
    {
      data: maxLines
        ? lines.length >= maxLines
          ? lines.slice(lines.length - maxLines)
          : lines
        : lines,
      searchText,
    },
    [data, searchText, maxLines]
  );

  const y = useCallback(() => {
    return lines.map((line, index) => ({
      line,
      searchInf: {
        idx: index,
      },
    }));
  }, [lines])();

  const [showAll, setShowAll] = useState(false);
  const ref = useRef();

  useEffect(() => {
    (async () => {
      if (follow && ref.current) {
        // @ts-ignore
        ref.current.scrollTo(0, ref.current.scrollHeight);
      }
    })();
  }, [data, maxLines]);

  return (
    <div className="hljs p-2 rounded-md flex flex-col gap-2 h-full">
      <div className="flex justify-between px-2 items-center border-b border-gray-500 pb-3">
        <div className="">
          {data ? title : 'No logs generated in last 24 hours'}
        </div>

        <div className="flex items-center gap-3">
          {actionComponent}
          {enableSearch && (
            <form
              className="flex gap-3 items-center text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                setShowAll((s) => !s);
              }}
            >
              <input
                className="bg-transparent border border-gray-400 rounded-md px-2 py-0.5 w-[10rem]"
                placeholder="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <div
                onClick={() => {
                  setShowAll((s) => !s);
                }}
                className="cursor-pointer active:translate-y-0.5 transition-all"
              >
                <VscListSelection
                  className={classNames('font-medium', {
                    'text-gray-200': !showAll,
                    'text-gray-600': showAll,
                  })}
                />
              </div>
              <code
                className={classNames('text-xs font-bold', {
                  'text-gray-200': (searchText ? x.length : 0) !== 0,
                  'text-gray-600': (searchText ? x.length : 0) === 0,
                })}
              >
                {x.reduce(
                  (acc, { searchInf }) => acc + (searchInf.match?.length || 0),
                  0
                )}{' '}
                matches
              </code>
            </form>
          )}
        </div>
      </div>

      <div
        className={classNames('flex flex-1 overflow-auto', {
          'no-scroll-bar': noScrollBar,
          'hljs-log-scrollbar': !noScrollBar,
        })}
        ref={ref}
      >
        <div className="flex flex-1 h-full">
          {!hideLines && (
            <div className="flex flex-col leading-6 sticky left-0">
              {(showAll ? y : x).map(({ searchInf }) => {
                return (
                  <LineNumber
                    key={`idx${searchInf.idx}`}
                    {...{ searchInf, lines: y, fontSize }}
                  />
                );
              })}
            </div>
          )}

          <div className="flex-1 flex flex-col leading-6">
            {(showAll ? y : x).map(({ line, searchInf }) => {
              return (
                <LogLine
                  key={searchInf.idx}
                  {...{
                    searchInf,
                    line,
                    fontSize,
                    selectableLines,
                    showAll,
                    searchText,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighlightJsLog;
